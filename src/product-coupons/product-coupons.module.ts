import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductCoupon } from '../shared/entities/product-coupon.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductCouponsService } from './product-coupons.service';
import { ProductCouponsAdminController } from './admin/product-coupons.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductCoupon, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductCouponsService, JwtStrategy],
  controllers: [ProductCouponsAdminController],
  exports: [ProductCouponsService],
})
export class ProductCouponsModule {}
