import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { RewardMallReceipt } from '../shared/entities/reward-mall-receipt.entity';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { UploadModule } from '../upload/upload.module';
import { RewardMallReceiptsService } from './reward-mall-receipts.service';
import { RewardMallReceiptGenerationService } from './services/reward-mall-receipt-generation.service';
import { RewardMallReceiptGenerationProcessor } from './processors/reward-mall-receipt-generation.processor';
import { RewardMallReceiptsController } from './user/reward-mall-receipts.controller';
import { RewardMallReceiptsAdminController } from './admin/reward-mall-receipts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardMallReceipt,
      RewardMallPurchase,
      ContactInfo,
    ]),
    BullModule.registerQueue({
      name: 'reward-mall-receipt-generation',
    }),
    UploadModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    RewardMallReceiptsService,
    RewardMallReceiptGenerationService,
    RewardMallReceiptGenerationProcessor,
    JwtStrategy,
  ],
  controllers: [
    RewardMallReceiptsController,
    RewardMallReceiptsAdminController,
  ],
  // RewardMallPurchasesService needs RewardMallReceiptsService for both the
  // accept-triggered auto-generation (ensureGenerationStarted) and the
  // receipt-status field on findMine — RewardMallPurchasesModule imports
  // this module for that. Nothing here depends back on
  // RewardMallPurchasesModule/Service, so the dependency is one-directional.
  exports: [RewardMallReceiptsService],
})
export class RewardMallReceiptsModule {}
