import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointDistribution } from '../shared/entities/point-distribution.entity';
import { PointDistributionService } from './point-distribution.service';
import { PointDistributionAdminController } from './admin/point-distribution.controller';
import { PointDistributionUserController } from './user/point-distribution.controller';
import { BullModule } from '@nestjs/bull';
import { PointDistributionQueueService } from './services/point-distribution-queue.service';
import { PointDistributionQueueProcessor } from './processors/point-distribution-queue.processor';
import { Order } from '../shared/entities/order.entity';
import { User } from '../shared/entities/user.entity';
import { Admin } from '../shared/entities/admin.entity';
import { PointDistributionPurchaseQueue } from '../shared/entities/point-distribution-purchase-queue.entity';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { PointAdminBalance } from '../shared/entities/point-admin-balance.entity';
import { PointPool } from '../shared/entities/point-pool.entity';
import { PointTransaction } from '../shared/entities/point-transaction.entity';
import { Product } from '../shared/entities/products.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointDistribution,
      Order,
      User,
      Admin,
      PointDistributionPurchaseQueue,
      PointUserBalance,
      PointAdminBalance,
      PointPool,
      PointTransaction,
      Product,
    ]),
    BullModule.registerQueue({
      name: 'point-distribution',
    }),

    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    PointDistributionService,
    JwtStrategy,
    PointDistributionQueueService,
    PointDistributionQueueProcessor,
  ],
  controllers: [
    PointDistributionAdminController,
    PointDistributionUserController,
  ],
  exports: [PointDistributionQueueService],
})
export class PointDistributionModule {}
