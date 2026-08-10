import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationCategory } from '../shared/entities/notification-category.entity';
import { CreateNotificationCategoryDto } from './dto/create-notification-category.dto';
import { UpdateNotificationCategoryDto } from './dto/update-notification-category.dto';

@Injectable()
export class NotificationCategoriesService {
  constructor(
    @InjectRepository(NotificationCategory)
    private readonly categoryRepo: Repository<NotificationCategory>,
  ) {}

  async create(dto: CreateNotificationCategoryDto) {
    try {
      const category = this.categoryRepo.create(dto);
      await this.categoryRepo.save(category);
      return {
        data: category,
        message: 'Notification category created successfully',
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A notification category with this name already exists',
        );
      }
      throw err;
    }
  }

  async findAll(page: number, limit: number, search?: string) {
    const query = this.categoryRepo
      .createQueryBuilder('category')
      .orderBy('category.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(category.name LIKE :search OR category.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        categories: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Notification categories fetched successfully',
    };
  }

  // User-facing listing — active categories only, no pagination (used to
  // populate a "filter my notifications by category" picker on the
  // frontend, not an admin management table).
  async findAllForUsers(search?: string) {
    const query = this.categoryRepo
      .createQueryBuilder('category')
      .where('category.status = :status', { status: 1 })
      .orderBy('category.id', 'ASC');

    if (search) {
      query.andWhere(
        '(category.name LIKE :search OR category.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Notification categories fetched successfully' };
  }

  async findOne(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException('Notification category not found');
    return { data: category, message: 'Notification category' };
  }

  async update(id: number, dto: UpdateNotificationCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException('Notification category not found');

    Object.assign(category, dto);

    try {
      await this.categoryRepo.save(category);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A notification category with this name already exists',
        );
      }
      throw err;
    }
    return {
      data: category,
      message: 'Notification category updated successfully',
    };
  }

  async remove(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException('Notification category not found');

    try {
      await this.categoryRepo.remove(category);
      return { message: 'Notification category removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete a category that is used by existing notifications',
        );
      }
      throw err;
    }
  }
}
