import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { RewardMallProductMedia } from '../shared/entities/reward-mall-product-media.entity';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { RewardMallProductMediaService } from './reward-mall-product-media.service';
import { RewardMallProductMediaAdminController } from './admin/reward-mall-product-media.controller';
import { RewardMallProductMediaUserController } from './user/reward-mall-product-media.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RewardMallProductMedia, RewardMallProduct]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RewardMallProductMediaService, JwtStrategy],
  controllers: [
    RewardMallProductMediaAdminController,
    RewardMallProductMediaUserController,
  ],
})
export class RewardMallProductMediaModule {}
