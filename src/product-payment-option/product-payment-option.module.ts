import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';

import { ProductPaymentOption } from 'src/shared/entities/product-payment-option.entity';
import { ProductPaymentOptionController } from './user/product-payment-option.controller';
import { ProductPaymentOptionService } from './product-payment-option.service';
import { Product } from 'src/shared/entities/products.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductPaymentOption, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [ProductPaymentOptionController],
  providers: [ProductPaymentOptionService, JwtStrategy],
})
export class ProductPaymentOptionModule {}
