import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PointDistributionQueueService } from '../services/point-distribution-queue.service';

@Processor('point-distribution')
export class PointDistributionQueueProcessor {
  private readonly logger = new Logger(
    PointDistributionQueueProcessor.name,
  );

  constructor(
    private readonly pointDistributionQueueService: PointDistributionQueueService,
  ) {}

  @Process('purchase-distribution')
  async handlePurchaseDistribution(
    job: Job<{ queueId: string }>,
  ): Promise<void> {
    this.logger.log(
      `Received Purchase Distribution Job: ${job.id}`,
    );

    await this.pointDistributionQueueService.processPurchase(
      job.data.queueId,
    );
  }
}