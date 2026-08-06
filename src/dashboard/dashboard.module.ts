import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { PointTransaction } from '../shared/entities/point-transaction.entity';
import { DashboardService } from './dashboard.service';
import { DashboardUserController } from './user/dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointUserBalance, PointTransaction]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [DashboardService, JwtStrategy],
  controllers: [DashboardUserController],
})
export class DashboardModule {}
