import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../shared/entities/products.entity';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { User } from '../shared/entities/user.entity';
import { SearchService } from './search.service';
import { SearchController } from './user/search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, RewardMallProduct, User])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
