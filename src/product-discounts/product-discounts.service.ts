import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductDiscount } from '../shared/entities/product-discount.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductType } from '../shared/enums/product-type.enum';
import { CreateProductDiscountDto } from './dto/create-product-discount.dto';
import { UpdateProductDiscountDto } from './dto/update-product-discount.dto';

@Injectable()
export class ProductDiscountsService {
  constructor(
    @InjectRepository(ProductDiscount)
    private readonly discountRepo: Repository<ProductDiscount>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDiscountDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const discount = this.discountRepo.create(dto);
    await this.discountRepo.save(discount);
    return { data: discount, message: 'Product discount created successfully' };
  }

  async findAll(
    productId?: number,
    productType?: ProductType,
    isActive?: number,
    search?: string,
  ) {
    const query = this.discountRepo
      .createQueryBuilder('discount')
      .leftJoinAndSelect('discount.product', 'product')
      .orderBy('discount.id', 'DESC');

    if (productId) {
      query.andWhere('discount.product_id = :productId', { productId });
    }
    if (productType) {
      query.andWhere('discount.product_type = :productType', { productType });
    }
    if (isActive !== undefined) {
      query.andWhere('discount.is_active = :isActive', { isActive });
    }
    if (search) {
      query.andWhere(
        '(discount.name LIKE :search OR product.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Product discounts fetched successfully' };
  }

  async findOne(id: number) {
    const discount = await this.discountRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!discount) throw new NotFoundException('Product discount not found');
    return { data: discount, message: 'Product discount' };
  }

  async update(id: number, dto: UpdateProductDiscountDto) {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) throw new NotFoundException('Product discount not found');

    Object.assign(discount, dto);
    await this.discountRepo.save(discount);
    return { data: discount, message: 'Product discount updated successfully' };
  }

  async remove(id: number) {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) throw new NotFoundException('Product discount not found');

    await this.discountRepo.remove(discount);
    return { message: 'Product discount removed successfully' };
  }

  // Used by CheckoutPricingService — all active rows for a product+type.
  async findApplicable(productId: number, productType: ProductType) {
    return this.discountRepo.find({
      where: { productId, productType, isActive: 1 },
    });
  }

  // Buyer preview — active discounts for a product+type, further filtered
  // by the current date window (start_at/end_at) the same way
  // CheckoutPricingService does, so an expired/not-yet-started discount
  // never shows as available. Quantity-gated discounts (minimum_quantity)
  // are still returned as-is — the buyer's cart quantity isn't known here,
  // so eligibility by quantity is left to the checkout pricing step.
  async findAvailableForProduct(productId: number, productType: ProductType) {
    const now = new Date();
    const data = (await this.findApplicable(productId, productType)).filter(
      (discount) => {
        if (discount.startAt && now < new Date(discount.startAt))
          return false;
        if (discount.endAt && now > new Date(discount.endAt)) return false;
        return true;
      },
    );
    return { data, message: 'Product discounts fetched successfully' };
  }
}
