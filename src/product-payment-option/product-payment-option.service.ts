import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductPaymentOption } from '../shared/entities/product-payment-option.entity';
import { Product } from '../shared/entities/products.entity';

import { CreateProductPaymentOptionDto } from './dto/create-product-payment-option.dto';

@Injectable()
export class ProductPaymentOptionService {
  constructor(
    @InjectRepository(ProductPaymentOption)
    private readonly paymentOptionRepo: Repository<ProductPaymentOption>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // Admin-managed — admin is the sole product owner now, so there's no
  // ownership check, just "does this product exist".
  async create(dto: CreateProductPaymentOptionDto): Promise<any> {
    const product = await this.productRepo.findOne({
      where: { id: dto.product_id },
    });
    if (!product) throw new NotFoundException('Product not found');

    const paymentOption = this.paymentOptionRepo.create(dto);
    return {
      message: 'Payment option created successfully',
      data: await this.paymentOptionRepo.save(paymentOption),
    };
  }

  async findOne(id: number): Promise<any> {
    const paymentOption = await this.paymentOptionRepo.findOne({
      where: { product_id: id },
      relations: ['paymentOption'],
    });
    if (!paymentOption)
      throw new NotFoundException('Product Payment Option not found');
    return { data: paymentOption, message: 'Payment options' };
  }

  // Admin removes a single product↔payment-option mapping by its own row
  // id (not product_id — that's a 1-to-many, this targets one specific
  // link row).
  async remove(id: number): Promise<any> {
    const paymentOption = await this.paymentOptionRepo.findOne({
      where: { id },
    });
    if (!paymentOption) {
      throw new NotFoundException('Product Payment Option not found');
    }

    await this.paymentOptionRepo.remove(paymentOption);
    return { message: 'Product payment option removed successfully' };
  }
}
