import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from '../shared/entities/products.entity';
import { ProductsAdminController } from './admin/product.controller';
import { ProductsUserController } from './user/product.controller';
import { ProductHistoryModule } from '../product-history/product-history.module';
import { PointDistribution } from 'src/shared/entities/point-distribution.entity';
import { ProductFeedback } from 'src/shared/entities/product-feedback.entity';
import { ProductFeedbackLike } from 'src/shared/entities/product-feedback-like.entity';
import { ProductBulkDetail } from 'src/shared/entities/product-bulk-detail.entity';
import { ProductViewsModule } from '../product-views/product-views.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      PointDistribution,
      ProductFeedback,
      ProductFeedbackLike,
      ProductBulkDetail,
    ]),
    ProductHistoryModule,
    ProductViewsModule,
    NotificationsModule,
  ],
  controllers: [ProductsAdminController, ProductsUserController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
