import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';

import { PaymentOption } from 'src/shared/entities/payment-option.entity';
import { PaymentOptionsController } from './admin/payment-option.controller';
import { PaymentOptionsService } from './payment-option.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOption]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [PaymentOptionsController],
  providers: [PaymentOptionsService, JwtStrategy],
})
export class PaymentOptionModule {}
