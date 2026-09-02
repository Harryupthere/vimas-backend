import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { RewardMallReceiptGenerationService } from '../services/reward-mall-receipt-generation.service';

@Processor('reward-mall-receipt-generation')
export class RewardMallReceiptGenerationProcessor {
  private readonly logger = new Logger(
    RewardMallReceiptGenerationProcessor.name,
  );

  constructor(
    private readonly rewardMallReceiptGenerationService: RewardMallReceiptGenerationService,
  ) {}

  @Process('generate-reward-mall-receipt')
  async handleGenerateReceipt(job: Job<{ invoiceId: string }>): Promise<void> {
    this.logger.log(
      `Received Generate Reward Mall Receipt Job: ${job.id} invoiceId=${job.data.invoiceId}`,
    );
    await this.rewardMallReceiptGenerationService.generate(
      job.data.invoiceId,
      job,
    );
  }
}
