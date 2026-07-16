import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PaymentStatus } from '../shared/entities/payment-status.entity';
import { PaymentStatusService } from './payment-status.service';
import { PaymentStatusAdminController } from './admin/payment-status.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentStatus]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PaymentStatusService, JwtStrategy],
  controllers: [PaymentStatusAdminController],
})
export class PaymentStatusModule {}
