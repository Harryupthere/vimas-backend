import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductMedia } from '../shared/entities/product-media.entity';
import { Product } from '../shared/entities/products.entity';

import { CreateProductMediaDto } from './dto/create-product-media.dto';
import { UpdateProductMediaDto } from './dto/update-product-media.dto';

@Injectable()
export class ProductMediaService {
  constructor(
    @InjectRepository(ProductMedia)
    private readonly mediaRepo: Repository<ProductMedia>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // Admin-managed — admin is the sole product owner now, so there's no
  // ownership check, just "does this product exist".
  async create(
    dto: CreateProductMediaDto,
  ): Promise<{ message: string; data: ProductMedia }> {
    const product = await this.productRepo.findOne({
      where: { id: dto.product_id },
    });
    if (!product) throw new NotFoundException('Product not found');

    const media = this.mediaRepo.create(dto);
    return {
      message: 'Media created successfully',
      data: await this.mediaRepo.save(media),
    };
  }

  async findAll(productId: number): Promise<any> {
    return this.mediaRepo.find({
      where: { product_id: productId },
      order: { sort_order: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateProductMediaDto): Promise<any> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    if (dto.product_id) {
      const product = await this.productRepo.findOne({
        where: { id: dto.product_id },
      });
      if (!product) throw new NotFoundException('Product not found');
    }

    Object.assign(media, dto);
    return {
      message: 'Media updated successfully',
      data: await this.mediaRepo.save(media),
    };
  }

  async remove(id: number): Promise<any> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    return {
      data: await this.mediaRepo.remove(media),
      message: 'Media removed successfully',
    };
  }
}
