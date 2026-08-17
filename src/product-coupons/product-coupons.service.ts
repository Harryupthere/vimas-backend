import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCoupon } from '../shared/entities/product-coupon.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductType } from '../shared/enums/product-type.enum';
import { CreateProductCouponDto } from './dto/create-product-coupon.dto';
import { UpdateProductCouponDto } from './dto/update-product-coupon.dto';

@Injectable()
export class ProductCouponsService {
  constructor(
    @InjectRepository(ProductCoupon)
    private readonly couponRepo: Repository<ProductCoupon>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductCouponDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const coupon = this.couponRepo.create(dto);
    await this.couponRepo.save(coupon);
    return { data: coupon, message: 'Product coupon created successfully' };
  }

  async findAll(
    productId?: number,
    productType?: ProductType,
    isActive?: number,
    search?: string,
  ) {
    const query = this.couponRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.product', 'product')
      .orderBy('coupon.id', 'DESC');

    if (productId) {
      query.andWhere('coupon.product_id = :productId', { productId });
    }
    if (productType) {
      query.andWhere('coupon.product_type = :productType', { productType });
    }
    if (isActive !== undefined) {
      query.andWhere('coupon.is_active = :isActive', { isActive });
    }
    if (search) {
      query.andWhere(
        '(coupon.code LIKE :search OR coupon.name LIKE :search OR product.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Product coupons fetched successfully' };
  }

  async findOne(id: number) {
    const coupon = await this.couponRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!coupon) throw new NotFoundException('Product coupon not found');
    return { data: coupon, message: 'Product coupon' };
  }

  async update(id: number, dto: UpdateProductCouponDto) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Product coupon not found');

    Object.assign(coupon, dto);
    await this.couponRepo.save(coupon);
    return { data: coupon, message: 'Product coupon updated successfully' };
  }

  async remove(id: number) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Product coupon not found');

    await this.couponRepo.remove(coupon);
    return { message: 'Product coupon removed successfully' };
  }

  // Used by CheckoutPricingService — every active row for this code,
  // filtered further (product-in-cart / product-type / validity window) by
  // the caller since a code isn't guaranteed unique across products.
  async findActiveByCode(code: string) {
    return this.couponRepo.find({ where: { code, isActive: 1 } });
  }
}
