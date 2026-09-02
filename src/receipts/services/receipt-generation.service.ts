import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import { Receipt, ReceiptStatus } from '../../shared/entities/receipt.entity';
import { Order } from '../../shared/entities/order.entity';
import { UploadService } from '../../upload/upload.service';
import { renderHtmlToPdf } from '../../shared/utils/pdf.util';
import {
  buildReceiptTemplateData,
  renderReceiptHtml,
} from '../../receipt-templates/receipt-template';

@Injectable()
export class ReceiptGenerationService {
  private readonly logger = new Logger(ReceiptGenerationService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    private readonly uploadService: UploadService,
  ) {}

  // Called by ReceiptGenerationProcessor for the "generate-receipt" job.
  // `job` is passed through only so attemptsMade/opts.attempts can decide
  // whether this was the final retry (see the catch block below) — Bull
  // itself, not this method, owns the actual retry/backoff.
  async generate(invoiceId: string, job: Job): Promise<void> {
    this.logger.log(
      `[${invoiceId}] Generating receipt (job ${job.id}, attempt ${job.attemptsMade + 1})`,
    );

    try {
      const orders = await this.orderRepo.find({
        where: { invoiceId },
        relations: [
          'product',
          'buyer',
          'buyerContactDetails',
          'paymentOption',
          'paymentStatus',
        ],
        order: { id: 'ASC' },
      });

      if (!orders.length) {
        // Not retryable in any meaningful sense (the invoice will never
        // grow order rows), but we still let Bull's attempts run out
        // rather than special-case it — a transient replication-lag read
        // right after the row was created is at least plausible.
        throw new Error(`No order rows found for invoice ${invoiceId}`);
      }

      const html = renderReceiptHtml(
        buildReceiptTemplateData(invoiceId, orders),
      );
      const pdfBuffer = await renderHtmlToPdf(html);

      const s3Key = `receipts/${invoiceId}.pdf`;
      await this.uploadService.uploadPrivateBuffer(
        s3Key,
        pdfBuffer,
        'application/pdf',
      );

      await this.receiptRepo.update(
        { invoiceId },
        {
          status: ReceiptStatus.GENERATED,
          s3Key,
          generatedAt: new Date(),
        },
      );
      this.logger.log(`[${invoiceId}] Receipt generated -> ${s3Key}`);
    } catch (err) {
      const attemptsMade = job.attemptsMade + 1; // this failed attempt counts
      const maxAttempts = job.opts?.attempts ?? 1;
      this.logger.error(
        `[${invoiceId}] Attempt ${attemptsMade}/${maxAttempts} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );

      // Only flip to 'failed' once Bull has no retries left — receipts has
      // no separate "processing" state, so writing 'failed' on every
      // attempt (as point-distribution does with its own status enum)
      // would show the frontend a failed/retry state mid-retry, even
      // though Bull is about to try again on its own.
      if (attemptsMade >= maxAttempts) {
        await this.receiptRepo.update(
          { invoiceId },
          { status: ReceiptStatus.FAILED },
        );
      }

      // Rethrow so Bull's configured attempts/backoff actually retries.
      throw err;
    }
  }
}
