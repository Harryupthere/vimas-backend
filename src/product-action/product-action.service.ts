import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductAction } from '../shared/entities/product-action.entity';
import { Product } from '../shared/entities/products.entity';
import { CreateProductActionDto } from './dto/create-product-action.dto';
import { MerchantUpdateProductActionDto } from './dto/merchant-update-product-action.dto';
import { AdminUpdateProductActionDto } from './dto/admin-update-product-action.dto';

@Injectable()
export class ProductActionsService {
  constructor(
    @InjectRepository(ProductAction)
    private readonly paRepo: Repository<ProductAction>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // merchant creates a product action (request listing/update)
  async create(merchantId: number, dto: CreateProductActionDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (Number(product.merchantId) !== Number(merchantId)) {
      throw new ForbiddenException('You are not the owner of this product');
    }

    const pa = await this.paRepo.findOne({
      where: { productId: dto.productId },
    });
    if (!pa) {
      dto.attemptType = 1;
      dto.currentStage = 0;
    } else {
      dto.attemptType = pa.attemptType + 1;
      dto.currentStage = 1;
    }

    const pasave = this.paRepo.create({
      product,
      productId: dto.productId,
      currentStage: dto.currentStage ?? 0,
      attemptType: dto.attemptType ?? 0,
      merchantRemarks: dto.merchantRemarks ?? [],
      currentStatus: 0, // initial status
    });

    const saved = await this.paRepo.save(pasave);
    return { data: saved, message: 'Product action created successfully' };
  }

  // get actions by product
  async findByProduct(merchantId: number, productId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (Number(product.merchantId) !== Number(merchantId)) {
      throw new ForbiddenException('You are not the owner of this product');
    }

    const pa = await this.paRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });

    if (pa.length === 0) {
      throw new NotFoundException('No actions found for this product');
    }

    return { data: pa, message: 'Product actions retrieved successfully' };
  }

  // get actions by product
  async findByProductAdmin(productId: number) {
    return this.paRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  // get actions for merchant (all actions related to merchant's products)
  async findByMerchant(merchantId: number) {
    // join to product and filter by product.merchantId
    return this.paRepo
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.product', 'product')
      .where('product.merchant_id = :merchantId', { merchantId })
      .orderBy('pa.created_at', 'DESC')
      .getMany();
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

  // merchant adds remarks to an existing action
  async merchantAddRemarks(
    actionId: number,
    merchantId: number,
    dto: MerchantUpdateProductActionDto,
  ) {
    const pa = await this.paRepo.findOne({
      where: { id: actionId },
      relations: ['product'],
    });
    if (!pa) throw new NotFoundException('Product action not found');

    if (Number(pa.product.merchantId) !== Number(merchantId)) {
      throw new ForbiddenException(
        'You are not the owner of this product action',
      );
    }

    if (dto.merchantRemarks && dto.merchantRemarks.length) {
      const existing = pa.merchantRemarks ?? [];
      pa.merchantRemarks = [...existing, ...dto.merchantRemarks];
      await this.paRepo.save(pa);
    }

    return pa;
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
