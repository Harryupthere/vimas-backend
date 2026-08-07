import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { RewardMallPurchaseStatus } from '../shared/entities/reward-mall-purchase-status.entity';
import { RewardMallPurchaseStatusService } from './reward-mall-purchase-status.service';
import { RewardMallPurchaseStatusAdminController } from './admin/reward-mall-purchase-status.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RewardMallPurchaseStatus]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RewardMallPurchaseStatusService, JwtStrategy],
  controllers: [RewardMallPurchaseStatusAdminController],
  exports: [RewardMallPurchaseStatusService],
})
export class RewardMallPurchaseStatusModule {}
