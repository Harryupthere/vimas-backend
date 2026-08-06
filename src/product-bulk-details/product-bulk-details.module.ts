import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductBulkDetailsService } from './product-bulk-details.service';
import { ProductBulkDetailsAdminController } from './admin/product-bulk-details.controller';
import { ProductBulkDetailsUserController } from './user/product-bulk-details.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductBulkDetail, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductBulkDetailsService, JwtStrategy],
  controllers: [
    ProductBulkDetailsAdminController,
    ProductBulkDetailsUserController,
  ],
})
export class ProductBulkDetailsModule {}
