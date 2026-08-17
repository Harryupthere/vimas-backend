import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductAddOn } from '../shared/entities/product-add-on.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductAddOnsService } from './product-add-ons.service';
import { ProductAddOnsAdminController } from './admin/product-add-ons.controller';
import { ProductAddOnsUserController } from './user/product-add-ons.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductAddOn, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductAddOnsService, JwtStrategy],
  controllers: [ProductAddOnsAdminController, ProductAddOnsUserController],
  exports: [ProductAddOnsService],
})
export class ProductAddOnsModule {}
