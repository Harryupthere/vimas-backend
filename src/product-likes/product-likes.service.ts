import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductLike } from '../shared/entities/product-like.entity';
import { Product } from '../shared/entities/products.entity';

@Injectable()
export class ProductLikesService {
  constructor(
    @InjectRepository(ProductLike)
    private readonly likeRepo: Repository<ProductLike>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // Recomputes products.like_count from the actual row count rather than
  // incrementing/decrementing in place, so it can never drift out of sync.
  private async syncLikeCount(productId: number): Promise<number> {
    const likeCount = await this.likeRepo.count({ where: { productId } });
    await this.productRepo.update(productId, { likeCount });
    return likeCount;
  }

  async toggle(userId: number, productId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.likeRepo.findOne({
      where: { userId, productId },
    });

    if (existing) {
      await this.likeRepo.remove(existing);
      const likeCount = await this.syncLikeCount(productId);
      return { data: { liked: false, likeCount }, message: 'Product unliked' };
    }

    await this.likeRepo.save(this.likeRepo.create({ userId, productId }));
    const likeCount = await this.syncLikeCount(productId);
    return { data: { liked: true, likeCount }, message: 'Product liked' };
  }

  async getStatus(userId: number, productId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.likeRepo.findOne({
      where: { userId, productId },
    });

    return {
      data: { liked: !!existing, likeCount: product.likeCount },
      message: 'Product like status',
    };
  }
}
