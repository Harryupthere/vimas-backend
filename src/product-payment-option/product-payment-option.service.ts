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

  async create(id: number, dto: CreateProductPaymentOptionDto): Promise<any> {
    const product = await this.productRepo.findOne({
      where: { id: dto.product_id, merchantId: id },
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
}
