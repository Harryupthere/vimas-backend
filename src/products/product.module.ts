import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from '../shared/entities/products.entity';
import { ProductsAdminController } from './admin/product.controller';
import { ProductsUserController } from './user/product.controller';
import { User } from 'src/shared/entities/user.entity';
import { ProductHistoryModule } from '../product-history/product-history.module';
import { ProductAction } from 'src/shared/entities/product-action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, User,ProductAction]), ProductHistoryModule],
  controllers: [ProductsAdminController, ProductsUserController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
