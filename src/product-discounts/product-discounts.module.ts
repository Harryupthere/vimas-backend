import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductDiscount } from '../shared/entities/product-discount.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductDiscountsService } from './product-discounts.service';
import { ProductDiscountsAdminController } from './admin/product-discounts.controller';
import { ProductDiscountsUserController } from './user/product-discounts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductDiscount, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductDiscountsService, JwtStrategy],
  controllers: [ProductDiscountsAdminController, ProductDiscountsUserController],
  exports: [ProductDiscountsService],
})
export class ProductDiscountsModule {}
