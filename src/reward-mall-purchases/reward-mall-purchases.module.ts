import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { PointTransaction } from '../shared/entities/point-transaction.entity';
import { RewardMallPurchasesService } from './reward-mall-purchases.service';
import { RewardMallPurchasesUserController } from './user/reward-mall-purchases.controller';
import { RewardMallPurchasesAdminController } from './admin/reward-mall-purchases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardMallPurchase,
      RewardMallProduct,
      PointUserBalance,
      PointTransaction,
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RewardMallPurchasesService, JwtStrategy],
  controllers: [
    RewardMallPurchasesUserController,
    RewardMallPurchasesAdminController,
  ],
})
export class RewardMallPurchasesModule {}
