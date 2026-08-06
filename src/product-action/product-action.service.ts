import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductAction } from '../shared/entities/product-action.entity';
import { Product } from '../shared/entities/products.entity';
import { AdminUpdateProductActionDto } from './dto/admin-update-product-action.dto';

@Injectable()
export class ProductActionsService {
  constructor(
    @InjectRepository(ProductAction)
    private readonly paRepo: Repository<ProductAction>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // get actions by product
  async findByProductAdmin(productId: number) {
    return this.paRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  // admin: list all actions (optionally filter by status/stage)
  async adminList(filters?: { status?: number; stage?: number }) {
    const qb = this.paRepo
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.product', 'product')
      .orderBy('pa.created_at', 'DESC');

    if (filters?.status !== undefined)
      qb.andWhere('pa.current_status = :status', { status: filters.status });
    if (filters?.stage !== undefined)
      qb.andWhere('pa.current_stage = :stage', { stage: filters.stage });

    return qb.getMany();
  }

  // admin updates an action (approve/reject/add admin remarks)
  async adminUpdate(actionId: number, dto: AdminUpdateProductActionDto) {
    const pa = await this.paRepo.findOne({
      where: { id: actionId },
      relations: ['product'],
    });
    if (!pa) throw new NotFoundException('Product action not found');

    // merge admin remarks arrays (append)
    if (dto.adminRemarks && dto.adminRemarks.length) {
      const existing = pa.adminRemarks ?? [];
      pa.adminRemarks = [...existing, ...dto.adminRemarks];
    }

    if (dto.currentStatus !== undefined) pa.currentStatus = dto.currentStatus;
    if (dto.currentStage !== undefined) pa.currentStage = dto.currentStage;

    const saved = await this.paRepo.save(pa);

    // Optionally: if admin sets currentStatus=1 (approved), you may want to update the product.status
    if (dto.currentStatus === 1) {
      pa.product.status = 1;
      await this.productRepo.save(pa.product);
    }

    return saved;
  }

  // get a single action
  async findOne(id: number) {
    const pa = await this.paRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!pa) throw new NotFoundException('Product action not found');
    return pa;
  }

  // remove an action (admin)
  async remove(actionId: number) {
    const pa = await this.paRepo.findOne({ where: { id: actionId } });
    if (!pa) throw new NotFoundException('Product action not found');
    await this.paRepo.remove(pa);
    return { message: 'Action removed' };
  }
}
