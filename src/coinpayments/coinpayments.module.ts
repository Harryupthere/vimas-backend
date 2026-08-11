import { Module } from '@nestjs/common';
import { CoinPaymentsService } from './coinpayments.service';

@Module({
  providers: [CoinPaymentsService],
  exports: [CoinPaymentsService],
})
export class CoinPaymentsModule {}
