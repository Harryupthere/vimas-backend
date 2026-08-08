import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../shared/entities/order-status.entity';
import { CreateOrderStatusDto } from './dto/create-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderStatusService {
  constructor(
    @InjectRepository(OrderStatus)
    private readonly orderStatusRepo: Repository<OrderStatus>,
  ) {}

  async create(dto: CreateOrderStatusDto) {
    const orderStatus = this.orderStatusRepo.create(dto);
    await this.orderStatusRepo.save(orderStatus);
    return { data: orderStatus, message: 'Order status created successfully' };
  }

  async findAll(search?: string) {
    const query = this.orderStatusRepo
      .createQueryBuilder('orderStatus')
      .orderBy('orderStatus.id', 'ASC');

    if (search) {
      query.andWhere(
        '(orderStatus.name LIKE :search OR orderStatus.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Order statuses fetched successfully' };
  }

  async findOne(id: number) {
    const orderStatus = await this.orderStatusRepo.findOne({ where: { id } });
    if (!orderStatus) throw new NotFoundException('Order status not found');
    return { data: orderStatus, message: 'Order status' };
  }

  async update(id: number, dto: UpdateOrderStatusDto) {
    const orderStatus = await this.orderStatusRepo.findOne({ where: { id } });
    if (!orderStatus) throw new NotFoundException('Order status not found');

    Object.assign(orderStatus, dto);
    await this.orderStatusRepo.save(orderStatus);
    return { data: orderStatus, message: 'Order status updated successfully' };
  }

  async remove(id: number) {
    const orderStatus = await this.orderStatusRepo.findOne({ where: { id } });
    if (!orderStatus) throw new NotFoundException('Order status not found');

    try {
      await this.orderStatusRepo.remove(orderStatus);
      return { message: 'Order status removed successfully' };
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
