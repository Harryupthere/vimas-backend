import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { In, Repository } from 'typeorm';
import { Receipt, ReceiptStatus } from '../shared/entities/receipt.entity';
import { Order } from '../shared/entities/order.entity';
import { UploadService } from '../upload/upload.service';

const DOWNLOAD_URL_TTL_SECONDS = 60 * 5; // 5 minutes

// Same job options the points-distribution queue uses (see
// OrdersService.finalizeOrdersAsPaid) — attempts + no explicit backoff
// (Bull retries immediately), removeOnFail kept so a row that exhausts its
// attempts is still inspectable in the queue.
const GENERATE_RECEIPT_JOB_OPTS = {
  attempts: 5,
  removeOnComplete: 1000,
  removeOnFail: false,
};

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectQueue('receipt-generation')
    private readonly receiptQueue: Queue,

    private readonly uploadService: UploadService,
  ) {}

  // Used by OrdersService.findMyOrders (Step 6) to attach a `receipt` field
  // per invoice group. Only returns entries that actually have a receipts
  // row — an invoice_id missing from the returned map means "not_created",
  // which the caller fills in itself (this service has no opinion on that
  // literal outside the pending/generated/failed enum).
  async getStatusesForInvoiceIds(
    invoiceIds: string[],
  ): Promise<Map<string, ReceiptStatus>> {
    if (!invoiceIds.length) return new Map();

    const receipts = await this.receiptRepo.find({
      where: { invoiceId: In(invoiceIds) },
    });
    return new Map(receipts.map((r) => [r.invoiceId, r.status]));
  }

  // Every order row for an invoice_id shares the same buyer_id (assigned
  // together at checkout — see OrdersService.checkout), so checking any one
  // row is enough to confirm ownership.
  private async assertOwnedInvoice(
    invoiceId: string,
    buyerId: number,
  ): Promise<void> {
    const owned = await this.orderRepo.findOne({
      where: { invoiceId, buyerId },
    });
    if (!owned) {
      throw new NotFoundException('Invoice not found');
    }
  }

  private async enqueueGeneration(invoiceId: string): Promise<void> {
    await this.receiptQueue.add(
      'generate-receipt',
      { invoiceId },
      GENERATE_RECEIPT_JOB_OPTS,
    );
    this.logger.log(`[${invoiceId}] Enqueued generate-receipt job`);
  }

  // Called internally by OrdersService.finalizeOrdersAsPaid right after an
  // order is confirmed — no buyer/ownership check here, since this isn't
  // reached via an inbound request. Same create-if-missing + enqueue shape
  // as requestGeneration below, minus the FAILED/GENERATED branches (a
  // receipts row can't be anything but freshly PENDING or already handled
  // at the moment an order is first confirmed): if a row already exists
  // (e.g. finalizeOrdersAsPaid running twice for the same invoice, or the
  // buyer already called requestGeneration first), do nothing rather than
  // enqueue a duplicate job.
  async ensureGenerationStarted(invoiceId: string): Promise<void> {
    const existing = await this.receiptRepo.findOne({ where: { invoiceId } });
    if (existing) return;

    await this.receiptRepo.save(
      this.receiptRepo.create({ invoiceId, status: ReceiptStatus.PENDING }),
    );
    await this.enqueueGeneration(invoiceId);
  }

  // POST /orders/:invoiceId/receipt/generate
  async requestGeneration(invoiceId: string, buyerId: number) {
    await this.assertOwnedInvoice(invoiceId, buyerId);

    const receipt = await this.receiptRepo.findOne({ where: { invoiceId } });

    if (!receipt) {
      await this.receiptRepo.save(
        this.receiptRepo.create({ invoiceId, status: ReceiptStatus.PENDING }),
      );
      await this.enqueueGeneration(invoiceId);
      return {
        data: { invoiceId, status: ReceiptStatus.PENDING },
        message: 'Receipt generation started',
      };
    }

    if (receipt.status === ReceiptStatus.FAILED) {
      await this.receiptRepo.update(receipt.id, {
        status: ReceiptStatus.PENDING,
        s3Key: null,
        generatedAt: null,
      });
      await this.enqueueGeneration(invoiceId);
      return {
        data: { invoiceId, status: ReceiptStatus.PENDING },
        message: 'Receipt generation restarted',
      };
    }

    // PENDING: a job is already in flight — don't enqueue a duplicate.
    // GENERATED: nothing to do; the download endpoint serves it.
    return {
      data: { invoiceId, status: receipt.status },
      message: 'Receipt generation status',
    };
  }

  // GET /orders/:invoiceId/receipt
  async getDownloadUrl(invoiceId: string, buyerId: number) {
    await this.assertOwnedInvoice(invoiceId, buyerId);

    const receipt = await this.receiptRepo.findOne({ where: { invoiceId } });

    if (
      !receipt ||
      receipt.status !== ReceiptStatus.GENERATED ||
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

  // GET /admin/receipts
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
      message: 'Receipts fetched successfully',
    };
  }

  // GET /admin/receipts/:invoiceId
  async adminDetail(invoiceId: string) {
    const orders = await this.orderRepo.find({
      where: { invoiceId },
      relations: [
        'product',
        'buyer',
        'buyerContactDetails',
        'orderStatus',
        'paymentStatus',
        'paymentOption',
      ],
      order: { id: 'ASC' },
    });

    if (!orders.length) {
      throw new NotFoundException('No orders found for this invoice');
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
        orders,
      },
      message: 'Receipt detail fetched successfully',
    };
  }
}
