// product-actions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductAction } from '../shared/entities/product-action.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductActionsService } from './product-action.service';
import { ProductActionsAdminController } from './admin/product-actions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductAction, Product])],
  providers: [ProductActionsService],
  controllers: [ProductActionsAdminController],
  exports: [ProductActionsService],
})
export class ProductActionsModule {}
