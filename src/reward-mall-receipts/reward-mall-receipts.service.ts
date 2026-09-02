import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { In, Repository } from 'typeorm';
import {
  RewardMallReceipt,
  RewardMallReceiptStatus,
} from '../shared/entities/reward-mall-receipt.entity';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { UploadService } from '../upload/upload.service';
import { ACCEPTED_REWARD_MALL_PURCHASE_STATUS_ID } from '../shared/constants/reward-mall-purchase-status.constants';

const DOWNLOAD_URL_TTL_SECONDS = 60 * 5; // 5 minutes

// Same job options the order-receipts and points-distribution queues use —
// see ReceiptsService/GENERATE_RECEIPT_JOB_OPTS.
const GENERATE_RECEIPT_JOB_OPTS = {
  attempts: 5,
  removeOnComplete: 1000,
  removeOnFail: false,
};

@Injectable()
export class RewardMallReceiptsService {
  private readonly logger = new Logger(RewardMallReceiptsService.name);

  constructor(
    @InjectRepository(RewardMallReceipt)
    private readonly receiptRepo: Repository<RewardMallReceipt>,

    @InjectRepository(RewardMallPurchase)
    private readonly purchaseRepo: Repository<RewardMallPurchase>,

    @InjectQueue('reward-mall-receipt-generation')
    private readonly receiptQueue: Queue,

    private readonly uploadService: UploadService,
  ) {}

  // Used by RewardMallPurchasesService.findMine to attach a `receipt` field
  // per purchase (mirrors ReceiptsService.getStatusesForInvoiceIds). Only
  // returns entries that actually have a receipts row — an invoice_id
  // missing from the map means "not_created", filled in by the caller.
  async getStatusesForInvoiceIds(
    invoiceIds: string[],
  ): Promise<Map<string, RewardMallReceiptStatus>> {
    if (!invoiceIds.length) return new Map();

    const receipts = await this.receiptRepo.find({
      where: { invoiceId: In(invoiceIds) },
    });
    return new Map(receipts.map((r) => [r.invoiceId, r.status]));
  }

  private async enqueueGeneration(invoiceId: string): Promise<void> {
    await this.receiptQueue.add(
      'generate-reward-mall-receipt',
      { invoiceId },
      GENERATE_RECEIPT_JOB_OPTS,
    );
    this.logger.log(`[${invoiceId}] Enqueued generate-reward-mall-receipt job`);
  }

  // Called internally by RewardMallPurchasesService.update once admin
  // accepts a redemption — no ownership check here, this isn't reached via
  // an inbound buyer request. If a row already exists (e.g. admin re-saves
  // the same accepted status, or the buyer already requested generation via
  // requestGeneration below), do nothing rather than enqueue a duplicate job.
  async ensureGenerationStarted(invoiceId: string): Promise<void> {
    const existing = await this.receiptRepo.findOne({ where: { invoiceId } });
    if (existing) return;

    await this.receiptRepo.save(
      this.receiptRepo.create({
        invoiceId,
        status: RewardMallReceiptStatus.PENDING,
      }),
    );
    await this.enqueueGeneration(invoiceId);
  }

  // A reward mall purchase is 1:1 with its invoice_id (no grouping like
  // orders), so ownership is just "does this invoice_id's purchase row
  // belong to this buyer". Returns the purchase itself so callers that also
  // need its statusId (requestGeneration below) don't have to fetch it a
  // second time.
  private async getOwnedPurchase(
    invoiceId: string,
    buyerId: number,
  ): Promise<RewardMallPurchase> {
    const purchase = await this.purchaseRepo.findOne({
      where: { invoiceId, userId: buyerId },
    });
    if (!purchase) {
      throw new NotFoundException('Invoice not found');
    }
    return purchase;
  }

  // POST /reward-mall-purchases/:invoiceId/receipt/generate
  async requestGeneration(invoiceId: string, buyerId: number) {
    const purchase = await this.getOwnedPurchase(invoiceId, buyerId);

    // Generation (first attempt or a retry after a queue failure) is only
    // ever allowed while the redemption currently sits at "Accepted" — the
    // same statusId that triggers it automatically in
    // RewardMallPurchasesService.update.
    if (purchase.statusId !== ACCEPTED_REWARD_MALL_PURCHASE_STATUS_ID) {
      throw new BadRequestException(
        'Receipt generation is only available once your redemption has been accepted.',
      );
    }

    const receipt = await this.receiptRepo.findOne({ where: { invoiceId } });

    if (!receipt) {
      await this.receiptRepo.save(
        this.receiptRepo.create({
          invoiceId,
          status: RewardMallReceiptStatus.PENDING,
        }),
      );
      await this.enqueueGeneration(invoiceId);
      return {
        data: { invoiceId, status: RewardMallReceiptStatus.PENDING },
        message: 'Receipt generation started',
      };
    }

    if (receipt.status === RewardMallReceiptStatus.FAILED) {
      await this.receiptRepo.update(receipt.id, {
        status: RewardMallReceiptStatus.PENDING,
        s3Key: null,
        generatedAt: null,
      });
      await this.enqueueGeneration(invoiceId);
      return {
        data: { invoiceId, status: RewardMallReceiptStatus.PENDING },
        message: 'Receipt generation restarted',
      };
    }

    return {
      data: { invoiceId, status: receipt.status },
      message: 'Receipt generation status',
    };
  }

  // GET /reward-mall-purchases/:invoiceId/receipt
  async getDownloadUrl(invoiceId: string, buyerId: number) {
    await this.getOwnedPurchase(invoiceId, buyerId);

    const receipt = await this.receiptRepo.findOne({ where: { invoiceId } });

    if (
      !receipt ||
      receipt.status !== RewardMallReceiptStatus.GENERATED ||
      !receipt.s3Key
    ) {
      return {
        data: { ready: false, status: receipt?.status ?? 'not_created' },
        message: 'Receipt is not ready yet',
      };
    }

    const url = await this.uploadService.generatePresignedGetUrl(
      receipt.s3Key,
      DOWNLOAD_URL_TTL_SECONDS,
      `receipt-${invoiceId}.pdf`,
    );

    return {
      data: {
        ready: true,
        status: receipt.status,
        url,
        expiresIn: DOWNLOAD_URL_TTL_SECONDS,
      },
      message: 'Receipt download URL generated',
    };
  }

  // GET /admin/reward-mall-receipts
  async adminList(
    page: number,
    limit: number,
    status?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const query = this.receiptRepo
      .createQueryBuilder('receipt')
      .orderBy('receipt.created_at', sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere('receipt.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    const receipts = await Promise.all(
      data.map(async (receipt) => ({
        ...receipt,
        downloadUrl: receipt.s3Key
          ? await this.uploadService.generatePresignedGetUrl(
              receipt.s3Key,
              DOWNLOAD_URL_TTL_SECONDS,
            )
          : null,
      })),
    );

    return {
      data: {
        receipts,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Reward mall receipts fetched successfully',
    };
  }

  // GET /admin/reward-mall-receipts/:invoiceId
  async adminDetail(invoiceId: string) {
    const purchase = await this.purchaseRepo.findOne({
      where: { invoiceId },
      relations: ['product', 'user', 'status'],
    });

    if (!purchase) {
      throw new NotFoundException(
        'No reward mall purchase found for this invoice',
      );
    }

    const receipt = await this.receiptRepo.findOne({ where: { invoiceId } });
    const downloadUrl = receipt?.s3Key
      ? await this.uploadService.generatePresignedGetUrl(
          receipt.s3Key,
          DOWNLOAD_URL_TTL_SECONDS,
        )
      : null;

    return {
      data: {
        receipt: receipt
          ? { ...receipt, downloadUrl }
          : { invoiceId, status: 'not_created' },
        purchase,
      },
      message: 'Reward mall receipt detail fetched successfully',
    };
  }
}
