import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../shared/entities/notification-type.entity';
import { CreateNotificationTypeDto } from './dto/create-notification-type.dto';
import { UpdateNotificationTypeDto } from './dto/update-notification-type.dto';

@Injectable()
export class NotificationTypesService {
  constructor(
    @InjectRepository(NotificationType)
    private readonly typeRepo: Repository<NotificationType>,
  ) {}

  async create(dto: CreateNotificationTypeDto) {
    try {
      const type = this.typeRepo.create(dto);
      await this.typeRepo.save(type);
      return { data: type, message: 'Notification type created successfully' };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A notification type with this name already exists',
        );
      }
      throw err;
    }
  }

  async findAll(page: number, limit: number, search?: string) {
    const query = this.typeRepo
      .createQueryBuilder('type')
      .orderBy('type.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(type.name LIKE :search OR type.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        types: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Notification types fetched successfully',
    };
  }

  async findOne(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Notification type not found');
    return { data: type, message: 'Notification type' };
  }

  async update(id: number, dto: UpdateNotificationTypeDto) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Notification type not found');

    Object.assign(type, dto);

    try {
      await this.typeRepo.save(type);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A notification type with this name already exists',
        );
      }
      throw err;
    }
    return { data: type, message: 'Notification type updated successfully' };
  }

  async remove(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Notification type not found');

    try {
      await this.typeRepo.remove(type);
      return { message: 'Notification type removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete a type that is used by existing notifications',
        );
      }
      throw err;
    }
  }
}
