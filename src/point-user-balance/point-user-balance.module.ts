import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { PointUserBalanceService } from './point-user-balance.service';
import { PointUserBalanceAdminController } from './admin/point-user-balance.controller';
import { PointUserBalanceUserController } from './user/point-user-balance.controller';
import { PointTransaction } from '../shared/entities/point-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointUserBalance, PointTransaction]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PointUserBalanceService, JwtStrategy],
  controllers: [
    PointUserBalanceAdminController,
    PointUserBalanceUserController,
  ],
})
export class PointUserBalanceModule {}
