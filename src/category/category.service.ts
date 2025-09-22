import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../shared/entities/categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  // CREATE category
  async create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create(dto);
    await this.categoryRepo.save(category);
    return { message: 'Category created successfully', data: category };
  }

  // FIND ALL with pagination
  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.categoryRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data: {
        category: data,
        page: page,
        limit: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'categories',
    };
  }

  // FIND ONE
  async findOne(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category)
      throw new NotFoundException(`Category with id ${id} not found`);
    return { data: category, message: 'Category' };
  }

  // UPDATE
  // UPDATE
  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    Object.assign(category, dto);

    await this.categoryRepo.save(category);

    return { message: 'Category updated successfully', data: category };
  }

  // FIND ALL without pagination
  async findAllNoPagination() {
    const categories = await this.categoryRepo.find({
      order: { id: 'DESC' },
    });

    return {
      data: categories,
      message: 'All categories fetched successfully',
      total: categories.length,
    };
  }
}
