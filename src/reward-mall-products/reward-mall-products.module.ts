import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { RewardMallCategory } from '../shared/entities/reward-mall-category.entity';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { RewardMallProductsService } from './reward-mall-products.service';
import { RewardMallProductsAdminController } from './admin/reward-mall-products.controller';
import { RewardMallProductsUserController } from './user/reward-mall-products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardMallProduct,
      RewardMallCategory,
      RewardMallPurchase,
      PointUserBalance,
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RewardMallProductsService, JwtStrategy],
  controllers: [
    RewardMallProductsAdminController,
    RewardMallProductsUserController,
  ],
  exports: [RewardMallProductsService],
})
export class RewardMallProductsModule {}
