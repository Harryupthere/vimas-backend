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

  // FIND ALL with pagination + optional search
  async findAll(page = 1, limit = 10, search?: string) {
    const qb = this.categoryRepo.createQueryBuilder('category');

    // apply search if provided (searches name and description)
    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      qb.where('category.name LIKE :s OR category.description LIKE :s', { s });
    }

    qb.orderBy('category.id', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: {
        category: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'categories',
    };
  }

  // FIND ALL without pagination
  async findAllNoPagination(parentId?: number, search?: string) {
    const qb = this.categoryRepo.createQueryBuilder('category');

    // filter by parentId if provided
    if (parentId) {
      qb.where('category.parent_id = :parentId', { parentId: +parentId });
    }

    // apply search if provided (searches name and description)
    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      if (parentId) {
        qb.andWhere('(category.name LIKE :s )', {
          s,
        });
      } else {
        qb.where('(category.name LIKE :s )', {
          s,
        });
      }
    }

    qb.orderBy('category.id', 'DESC');
    const categories = await qb.getMany();
    return {
      data: categories,
      message: parentId
        ? 'Categories with the specified parent fetched successfully'
        : 'All categories fetched successfully',
      total: categories.length,
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
}
