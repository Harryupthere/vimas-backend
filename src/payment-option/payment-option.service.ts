import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { CreatePaymentOptionDto } from './dto/create-payment-option.dto';
import { UpdatePaymentOptionDto } from './dto/update-payment-option.dto';

@Injectable()
export class PaymentOptionsService {
  constructor(
    @InjectRepository(PaymentOption)
    private readonly paymentOptionRepo: Repository<PaymentOption>,
  ) {}

  async create(dto: CreatePaymentOptionDto) {
    const paymentOption = this.paymentOptionRepo.create(dto);
    await this.paymentOptionRepo.save(paymentOption);
    return {
      data: paymentOption,
      message: 'Payment option created successfully',
    };
  }

  async findAll(search?: string, status?: number) {
    const query = this.paymentOptionRepo.createQueryBuilder('paymentOption');

    if (status !== undefined) {
      query.andWhere('paymentOption.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(paymentOption.name LIKE :search OR paymentOption.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const options = await query.getMany();
    return {
      data: options,
      message: 'Payment options fetched successfully',
    };
  }

  async findOne(id: number) {
    const paymentOption = await this.paymentOptionRepo.findOneBy({ id });
    if (!paymentOption) {
      throw new NotFoundException('Payment option not found');
    }
    return {
      data: paymentOption,
      message: 'Payment option fetched successfully',
    };
  }

  async update(id: number, dto: UpdatePaymentOptionDto) {
    const paymentOption = await this.paymentOptionRepo.findOneBy({ id });
    if (!paymentOption) {
      throw new NotFoundException('Payment option not found');
    }

    Object.assign(paymentOption, dto);
    await this.paymentOptionRepo.save(paymentOption);

    return {
      data: paymentOption,
      message: 'Payment option updated successfully',
    };
  }

  async remove(id: number) {
    const option = await this.paymentOptionRepo.findOne({ where: { id } });

    if (!option) {
      throw new NotFoundException('Payment option not found');
    }

    await this.paymentOptionRepo.remove(option);

    return { message: 'Payment option removed successfully' };
  }
}
