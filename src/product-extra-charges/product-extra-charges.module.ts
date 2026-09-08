import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductExtraCharge } from '../shared/entities/product-extra-charge.entity';
import { Product } from '../shared/entities/products.entity';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { ProductExtraChargesService } from './product-extra-charges.service';
import { ProductExtraChargesAdminController } from './admin/product-extra-charges.controller';
import { ProductExtraChargesUserController } from './user/product-extra-charges.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductExtraCharge, Product, PaymentOption]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductExtraChargesService, JwtStrategy],
  controllers: [
    ProductExtraChargesAdminController,
    ProductExtraChargesUserController,
  ],
  exports: [ProductExtraChargesService],
})
export class ProductExtraChargesModule {}
