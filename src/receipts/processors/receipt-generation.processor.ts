import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ReceiptGenerationService } from '../services/receipt-generation.service';

@Processor('receipt-generation')
export class ReceiptGenerationProcessor {
  private readonly logger = new Logger(ReceiptGenerationProcessor.name);

  constructor(
    private readonly receiptGenerationService: ReceiptGenerationService,
  ) {}

  @Process('generate-receipt')
  async handleGenerateReceipt(job: Job<{ invoiceId: string }>): Promise<void> {
    this.logger.log(
      `Received Generate Receipt Job: ${job.id} invoiceId=${job.data.invoiceId}`,
    );
    await this.receiptGenerationService.generate(job.data.invoiceId, job);
  }
}
