import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { Product } from '../shared/entities/products.entity';
import { CreateProductBulkDetailDto } from './dto/create-product-bulk-detail.dto';
import { UpdateProductBulkDetailDto } from './dto/update-product-bulk-detail.dto';

@Injectable()
export class ProductBulkDetailsService {
  constructor(
    @InjectRepository(ProductBulkDetail)
    private readonly bulkDetailRepo: Repository<ProductBulkDetail>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductBulkDetailDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    try {
      const { showTotalPoints, showPointsSharing, ...rest } = dto;
      const bulkDetail = this.bulkDetailRepo.create({
        ...rest,
        // Both columns default to 1 (visible) in the DB — only override
        // when the admin explicitly sent a value, so an omitted field
        // doesn't get silently forced to 0.
        ...(showTotalPoints !== undefined && {
          showTotalPoints: showTotalPoints ? 1 : 0,
        }),
        ...(showPointsSharing !== undefined && {
          showPointsSharing: showPointsSharing ? 1 : 0,
        }),
      });
      await this.bulkDetailRepo.save(bulkDetail);
      return {
        data: bulkDetail,
        message: 'Product bulk detail created successfully',
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A bulk detail with this package quantity already exists for this product',
        );
      }
      throw err;
    }
  }

  // admin listing — optionally scoped to a product and/or status
  async findAll(productId?: number, status?: number) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (status !== undefined) where.status = status;

    const data = await this.bulkDetailRepo.find({
      where,
      order: { sortOrder: 'ASC', packageQuantity: 'ASC' },
    });
    return { data, message: 'Product bulk details fetched successfully' };
  }

  async findOne(id: number) {
    const bulkDetail = await this.bulkDetailRepo.findOne({ where: { id } });
    if (!bulkDetail)
      throw new NotFoundException('Product bulk detail not found');
    return { data: bulkDetail, message: 'Product bulk detail' };
  }

  async update(id: number, dto: UpdateProductBulkDetailDto) {
    const bulkDetail = await this.bulkDetailRepo.findOne({ where: { id } });
    if (!bulkDetail)
      throw new NotFoundException('Product bulk detail not found');

    const { showTotalPoints, showPointsSharing, ...rest } = dto;
    Object.assign(bulkDetail, {
      ...rest,
      ...(showTotalPoints !== undefined && {
        showTotalPoints: showTotalPoints ? 1 : 0,
      }),
      ...(showPointsSharing !== undefined && {
        showPointsSharing: showPointsSharing ? 1 : 0,
      }),
    });
    try {
      await this.bulkDetailRepo.save(bulkDetail);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A bulk detail with this package quantity already exists for this product',
        );
      }
      throw err;
    }
    return {
      data: bulkDetail,
      message: 'Product bulk detail updated successfully',
    };
  }

  async remove(id: number) {
    const bulkDetail = await this.bulkDetailRepo.findOne({ where: { id } });
    if (!bulkDetail)
      throw new NotFoundException('Product bulk detail not found');

    await this.bulkDetailRepo.remove(bulkDetail);
    return { message: 'Product bulk detail removed successfully' };
  }

  // Buyer "package picker" list for a product — just enough to build a
  // "buy N units @ price" selector (id is included so the buyer's choice
  // can be looked up via findOneForProduct below).
  async findPackagesForProduct(productId: number) {
    const data = await this.bulkDetailRepo.find({
      where: { productId, status: 1 },
      order: { sortOrder: 'ASC', packageQuantity: 'ASC' },
      select: ['id', 'packageQuantity', 'unitPrice'],
    });
    return { data, message: 'Product bulk packages fetched successfully' };
  }

  // Buyer drill-down — full bulk-detail row for a package the buyer picked,
  // scoped to the product so one product's package id can't be used to
  // probe another product's pricing.
  async findOneForProduct(productId: number, id: number) {
    const bulkDetail = await this.bulkDetailRepo.findOne({
      where: { id, productId, status: 1 },
    });
    if (!bulkDetail)
      throw new NotFoundException('Product bulk detail not found');
    return { data: bulkDetail, message: 'Product bulk detail' };
  }
}
