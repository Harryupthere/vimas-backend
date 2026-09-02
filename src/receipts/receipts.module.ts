import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { Receipt } from '../shared/entities/receipt.entity';
import { Order } from '../shared/entities/order.entity';
import { UploadModule } from '../upload/upload.module';
import { ReceiptsService } from './receipts.service';
import { ReceiptGenerationService } from './services/receipt-generation.service';
import { ReceiptGenerationProcessor } from './processors/receipt-generation.processor';
import { ReceiptsController } from './user/receipts.controller';
import { ReceiptsAdminController } from './admin/receipts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, Order]),
    BullModule.registerQueue({
      name: 'receipt-generation',
    }),
    UploadModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    ReceiptsService,
    ReceiptGenerationService,
    ReceiptGenerationProcessor,
    JwtStrategy,
  ],
  controllers: [ReceiptsController, ReceiptsAdminController],
  // OrdersService needs ReceiptsService.getStatusesForInvoiceIds for the
  // receipt-status field on findMyOrders (Step 6) — OrdersModule imports
  // this module for that. Nothing in this module depends back on
  // OrdersModule/OrdersService, so the dependency is one-directional.
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
