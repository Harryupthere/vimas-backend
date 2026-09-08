import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductExtraCharge } from '../shared/entities/product-extra-charge.entity';
import { Product } from '../shared/entities/products.entity';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { ProductType } from '../shared/enums/product-type.enum';
import { CreateProductExtraChargeDto } from './dto/create-product-extra-charge.dto';
import { UpdateProductExtraChargeDto } from './dto/update-product-extra-charge.dto';

@Injectable()
export class ProductExtraChargesService {
  constructor(
    @InjectRepository(ProductExtraCharge)
    private readonly extraChargeRepo: Repository<ProductExtraCharge>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(PaymentOption)
    private readonly paymentOptionRepo: Repository<PaymentOption>,
  ) {}

  async create(dto: CreateProductExtraChargeDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const paymentOption = await this.paymentOptionRepo.findOne({
      where: { id: dto.paymentOptionId },
    });
    if (!paymentOption) throw new NotFoundException('Payment option not found');

    const charge = this.extraChargeRepo.create(dto);
    await this.extraChargeRepo.save(charge);
    return {
      data: charge,
      message: 'Product extra charge created successfully',
    };
  }

  async findAll(
    productId?: number,
    productType?: ProductType,
    paymentOptionId?: number,
    isActive?: number,
    search?: string,
  ) {
    const query = this.extraChargeRepo
      .createQueryBuilder('charge')
      .leftJoinAndSelect('charge.product', 'product')
      .leftJoinAndSelect('charge.paymentOption', 'paymentOption')
      .orderBy('charge.id', 'DESC');

    if (productId) {
      query.andWhere('charge.product_id = :productId', { productId });
    }
    if (productType) {
      query.andWhere('charge.product_type = :productType', { productType });
    }
    if (paymentOptionId) {
      query.andWhere('charge.payment_option_id = :paymentOptionId', {
        paymentOptionId,
      });
    }
    if (isActive !== undefined) {
      query.andWhere('charge.is_active = :isActive', { isActive });
    }
    if (search) {
      query.andWhere(
        '(charge.name LIKE :search OR product.name LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Product extra charges fetched successfully' };
  }

  async findOne(id: number) {
    const charge = await this.extraChargeRepo.findOne({
      where: { id },
      relations: ['product', 'paymentOption'],
    });
    if (!charge) throw new NotFoundException('Product extra charge not found');
    return { data: charge, message: 'Product extra charge' };
  }

  async update(id: number, dto: UpdateProductExtraChargeDto) {
    const charge = await this.extraChargeRepo.findOne({ where: { id } });
    if (!charge) throw new NotFoundException('Product extra charge not found');

    if (dto.paymentOptionId) {
      const paymentOption = await this.paymentOptionRepo.findOne({
        where: { id: dto.paymentOptionId },
      });
      if (!paymentOption)
        throw new NotFoundException('Payment option not found');
    }

    Object.assign(charge, dto);
    await this.extraChargeRepo.save(charge);
    return {
      data: charge,
      message: 'Product extra charge updated successfully',
    };
  }

  async remove(id: number) {
    const charge = await this.extraChargeRepo.findOne({ where: { id } });
    if (!charge) throw new NotFoundException('Product extra charge not found');

    await this.extraChargeRepo.remove(charge);
    return { message: 'Product extra charge removed successfully' };
  }

  // Used by CheckoutPricingService — all active charges for a product+type,
  // optionally narrowed to a single payment option (e.g. the one the buyer
  // has selected at checkout).
  async findApplicable(
    productId: number,
    productType: ProductType,
    paymentOptionId?: number,
  ) {
    return this.extraChargeRepo.find({
      where: {
        productId,
        productType,
        isActive: 1,
        ...(paymentOptionId ? { paymentOptionId } : {}),
      },
      relations: ['paymentOption'],
    });
  }

  // Buyer preview — active extra charges for a product+type (optionally for
  // one payment option), auto-applied at checkout (see
  // CheckoutPricingService), shown here so the buyer can see them ahead of
  // time rather than only at final pricing.
  async findAvailableForProduct(
    productId: number,
    productType: ProductType,
    paymentOptionId?: number,
  ) {
    const data = await this.findApplicable(
      productId,
      productType,
      paymentOptionId,
    );
    return { data, message: 'Product extra charges fetched successfully' };
  }
}
