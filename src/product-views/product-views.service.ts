import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductView } from '../shared/entities/product-view.entity';
import { Product } from '../shared/entities/products.entity';

@Injectable()
export class ProductViewsService {
  constructor(
    @InjectRepository(ProductView)
    private readonly viewRepo: Repository<ProductView>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // Upserts (user, product) — a repeat view just touches last_viewed_at,
  // it never inserts a second row (unique_view_count semantics, per the
  // uk_product_view(user_id, product_id) constraint) — then recomputes
  // products.view_count from the actual row count so it can't drift.
  async recordView(userId: number, productId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.viewRepo.findOne({
      where: { userId, productId },
    });

    if (existing) {
      existing.lastViewedAt = new Date();
      await this.viewRepo.save(existing);
    } else {
      await this.viewRepo.save(
        this.viewRepo.create({
          userId,
          productId,
          lastViewedAt: new Date(),
        }),
      );
    }

    const viewCount = await this.viewRepo.count({ where: { productId } });
    await this.productRepo.update(productId, { viewCount });

    return { data: { viewCount }, message: 'View recorded' };
  }
}
