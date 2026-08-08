import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardMallCategory } from '../shared/entities/reward-mall-category.entity';
import { CreateRewardMallCategoryDto } from './dto/create-reward-mall-category.dto';
import { UpdateRewardMallCategoryDto } from './dto/update-reward-mall-category.dto';

@Injectable()
export class RewardMallCategoriesService {
  constructor(
    @InjectRepository(RewardMallCategory)
    private readonly categoryRepo: Repository<RewardMallCategory>,
  ) {}

  async create(dto: CreateRewardMallCategoryDto) {
    const category = this.categoryRepo.create(dto);
    await this.categoryRepo.save(category);
    return {
      data: category,
      message: 'Reward mall category created successfully',
    };
  }

  async findAll(status?: number, search?: string) {
    const query = this.categoryRepo
      .createQueryBuilder('category')
      .orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.id', 'ASC');

    if (status !== undefined) {
      query.andWhere('category.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(category.name LIKE :search OR category.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Reward mall categories fetched successfully' };
  }

  async findOne(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException('Reward mall category not found');
    return { data: category, message: 'Reward mall category' };
  }

  async update(id: number, dto: UpdateRewardMallCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException('Reward mall category not found');

    Object.assign(category, dto);
    await this.categoryRepo.save(category);
    return {
      data: category,
      message: 'Reward mall category updated successfully',
    };
  }

  async remove(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException('Reward mall category not found');

    try {
      await this.categoryRepo.remove(category);
      return { message: 'Reward mall category removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete a category that has existing reward mall products',
        );
      }
      throw err;
    }
  }
}
