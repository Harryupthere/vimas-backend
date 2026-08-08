import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOption } from '../shared/entities/payment-option.entity';

@Injectable()
export class PaymentOptionsService {
  constructor(
    @InjectRepository(PaymentOption)
    private readonly paymentOptionRepo: Repository<PaymentOption>,
  ) {}

  async create(dto: any) {
    const paymentOption = this.paymentOptionRepo.create(dto);
    await this.paymentOptionRepo.save(paymentOption);
    return {
      data: paymentOption,
      message: 'Payment option created successfully',
    };
  }

  async findAll(search?: string) {
    const query = this.paymentOptionRepo.createQueryBuilder('paymentOption');

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
    return {
      data: await this.paymentOptionRepo.findOneBy({ id }),
      message: 'Payment option fetched successfully',
    };
  }

  async update(id: number, dto: any) {
    await this.paymentOptionRepo.update(id, dto);
    return {
      data: this.findOne(id),
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
