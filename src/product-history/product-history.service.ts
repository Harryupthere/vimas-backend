import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductHistory } from '../shared/entities/product-history.entity';

@Injectable()
export class ProductHistoryService {
  constructor(
    @InjectRepository(ProductHistory)
    private readonly productHistoryRepo: Repository<ProductHistory>,
  ) {}

  // internal helper, called from other services when a product-related row changes
  async record(
    productId: number,
    tableName: string,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
  ) {
    const history = this.productHistoryRepo.create({
      productId,
      tableName,
      oldValues,
      newValues,
    });
    return this.productHistoryRepo.save(history);
  }

  async findAll(page: number, limit: number, productId?: number) {
    const where = productId ? { productId } : {};
    const [data, total] = await this.productHistoryRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: {
        history: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Product history fetched successfully',
    };
  }

  async findOne(id: number) {
    const history = await this.productHistoryRepo.findOne({ where: { id } });
    if (!history) throw new NotFoundException('Product history not found');
    return { data: history, message: 'Product history' };
  }
}
