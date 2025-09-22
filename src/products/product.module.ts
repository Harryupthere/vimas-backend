import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from '../shared/entities/products.entity';
import { ProductsAdminController } from './admin/product.controller';
import { ProductsUserController } from './user/product.controller';
import { User } from 'src/shared/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, User])],
  controllers: [ProductsAdminController, ProductsUserController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
