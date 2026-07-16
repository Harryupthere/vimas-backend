import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentStatus } from '../shared/entities/payment-status.entity';
import { CreatePaymentStatusDto } from './dto/create-payment-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentStatusService {
  constructor(
    @InjectRepository(PaymentStatus)
    private readonly paymentStatusRepo: Repository<PaymentStatus>,
  ) {}

  async create(dto: CreatePaymentStatusDto) {
    const paymentStatus = this.paymentStatusRepo.create(dto);
    await this.paymentStatusRepo.save(paymentStatus);
    return {
      data: paymentStatus,
      message: 'Payment status created successfully',
    };
  }

  async findAll() {
    const data = await this.paymentStatusRepo.find({ order: { id: 'ASC' } });
    return { data, message: 'Payment statuses fetched successfully' };
  }

  async findOne(id: number) {
    const paymentStatus = await this.paymentStatusRepo.findOne({
      where: { id },
    });
    if (!paymentStatus)
      throw new NotFoundException('Payment status not found');
    return { data: paymentStatus, message: 'Payment status' };
  }

  async update(id: number, dto: UpdatePaymentStatusDto) {
    const paymentStatus = await this.paymentStatusRepo.findOne({
      where: { id },
    });
    if (!paymentStatus)
      throw new NotFoundException('Payment status not found');

    Object.assign(paymentStatus, dto);
    await this.paymentStatusRepo.save(paymentStatus);
    return {
      data: paymentStatus,
      message: 'Payment status updated successfully',
    };
  }

  async remove(id: number) {
    const paymentStatus = await this.paymentStatusRepo.findOne({
      where: { id },
    });
    if (!paymentStatus)
      throw new NotFoundException('Payment status not found');

    try {
      await this.paymentStatusRepo.remove(paymentStatus);
      return { message: 'Payment status removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete a status that is used by existing orders',
        );
      }
      throw err;
    }
  }
}
