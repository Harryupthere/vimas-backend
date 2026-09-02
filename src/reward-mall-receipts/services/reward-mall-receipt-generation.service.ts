import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import {
  RewardMallReceipt,
  RewardMallReceiptStatus,
} from '../../shared/entities/reward-mall-receipt.entity';
import { RewardMallPurchase } from '../../shared/entities/reward-mall-purchase.entity';
import { ContactInfo } from '../../shared/entities/contact-info.entity';
import { UploadService } from '../../upload/upload.service';
import { renderHtmlToPdf } from '../../shared/utils/pdf.util';
import {
  buildRewardMallReceiptTemplateData,
  renderRewardMallReceiptHtml,
} from '../../receipt-templates/reward-mall-receipt-template';

@Injectable()
export class RewardMallReceiptGenerationService {
  private readonly logger = new Logger(RewardMallReceiptGenerationService.name);

  constructor(
    @InjectRepository(RewardMallReceipt)
    private readonly receiptRepo: Repository<RewardMallReceipt>,

    @InjectRepository(RewardMallPurchase)
    private readonly purchaseRepo: Repository<RewardMallPurchase>,

    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,

    private readonly uploadService: UploadService,
  ) {}

  // Called by RewardMallReceiptGenerationProcessor for the
  // "generate-reward-mall-receipt" job. Same retry-exhaustion-aware
  // failure handling as ReceiptGenerationService.generate — see there for
  // why 'failed' is only written once Bull has no attempts left.
  async generate(invoiceId: string, job: Job): Promise<void> {
    this.logger.log(
      `[${invoiceId}] Generating reward mall receipt (job ${job.id}, attempt ${job.attemptsMade + 1})`,
    );

    try {
      const purchase = await this.purchaseRepo.findOne({
        where: { invoiceId },
        relations: ['product', 'user', 'status'],
      });

      if (!purchase) {
        throw new Error(
          `No reward mall purchase found for invoice ${invoiceId}`,
        );
      }

      // A buyer isn't required to have contact_info on file before
      // redeeming — this can legitimately come back null, and the template
      // falls back to "No delivery address found." for it (see
      // buildRewardMallReceiptTemplateData). Most recently created row
      // stands in for a "default" address, since contact_info has no such
      // flag of its own.
      const contact = await this.contactInfoRepo.findOne({
        where: { userId: purchase.userId },
        order: { id: 'DESC' },
      });

      const html = renderRewardMallReceiptHtml(
        buildRewardMallReceiptTemplateData(invoiceId, purchase, contact),
      );
      const pdfBuffer = await renderHtmlToPdf(html);

      const s3Key = `reward-mall-receipts/${invoiceId}.pdf`;
      await this.uploadService.uploadPrivateBuffer(
        s3Key,
        pdfBuffer,
        'application/pdf',
      );

      await this.receiptRepo.update(
        { invoiceId },
        {
          status: RewardMallReceiptStatus.GENERATED,
          s3Key,
          generatedAt: new Date(),
        },
      );
      this.logger.log(
        `[${invoiceId}] Reward mall receipt generated -> ${s3Key}`,
      );
    } catch (err) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts ?? 1;
      this.logger.error(
        `[${invoiceId}] Attempt ${attemptsMade}/${maxAttempts} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );

      if (attemptsMade >= maxAttempts) {
        await this.receiptRepo.update(
          { invoiceId },
          { status: RewardMallReceiptStatus.FAILED },
        );
      }

      throw err;
    }
  }
}
