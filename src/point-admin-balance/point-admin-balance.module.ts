import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointAdminBalance } from '../shared/entities/point-admin-balance.entity';
import { PointAdminBalanceService } from './point-admin-balance.service';
import { PointAdminBalanceAdminController } from './admin/point-admin-balance.controller';

// No user-facing controller: an admin's point balance is internal financial
// data with no legitimate buyer/merchant use case, unlike PointUserBalance.
@Module({
  imports: [
    TypeOrmModule.forFeature([PointAdminBalance]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PointAdminBalanceService, JwtStrategy],
  controllers: [PointAdminBalanceAdminController],
})
export class PointAdminBalanceModule {}
