import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brand } from '../shared/entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/updte-brand.dto';
import { Repository, DeepPartial } from 'typeorm';
import { Category } from '../shared/entities/categories.entity';
import { CategoryBrand } from '../shared/entities/category-brand.entity';
import { CreateCategoryBrandDto } from './dto/category-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(CategoryBrand)
    private readonly cbRepo: Repository<CategoryBrand>,
  ) {}

  // CREATE brand
  async create(dto: CreateBrandDto) {
    const brand = this.brandRepo.create(dto);
    await this.brandRepo.save(brand);
    return { message: 'brand created successfully', data: brand };
  }

  // FIND ALL with pagination
  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.brandRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data: {
        brand: data,
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
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException(`brand with id ${id} not found`);
    return { data: brand, message: 'brand' };
  }

  // UPDATE
  // UPDATE
  async update(id: number, dto: UpdateBrandDto) {
    const brand = await this.brandRepo.findOne({ where: { id } });

    if (!brand) {
      throw new NotFoundException('brand not found');
    }

    Object.assign(brand, dto);

    await this.brandRepo.save(brand);

    return { message: 'brand updated successfully', data: brand };
  }



  // FIND ALL without pagination
  async findAllNoPagination() {
    const brands = await this.brandRepo.find({
      order: { id: 'DESC' },
    });

    return {
      data: brands,
      message: 'All brands fetched successfully',
      total: brands.length,
    };
  }

  // Add mapping
  async addMapping(dto: CreateCategoryBrandDto) {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.category_id },
    });
    const brand = await this.brandRepo.findOne({ where: { id: dto.brand_id } });

    if (!category) throw new NotFoundException('Category not found');
    if (!brand) throw new NotFoundException('Brand not found');

    const exists = await this.cbRepo.findOne({
      where: { category: { id: dto.category_id }, brand: { id: dto.brand_id } },
    });
    if (exists) throw new ConflictException('Mapping already exists');

    const mapping = this.cbRepo.create({ category, brand });
    await this.cbRepo.save(mapping);

    return { message: 'Mapping created successfully', data: mapping };
  }

  // Get brands for a category
  async getBrandsByCategory(categoryId: number) {
    const mappings = await this.cbRepo.find({
      where: { category: { id: categoryId } },
      relations: ['brand'],
    });

    return {data:mappings.map((m) => m.brand),message:"brands"};
  }

  // Get categories for a brand
  async getCategoriesByBrand(brandId: number) {
    const mappings = await this.cbRepo.find({
      where: { brand: { id: brandId } },
      relations: ['category'],
    });

    return {data:mappings.map((m) => m.category),message:"categories"};
  }

  // Remove mapping
  async removeMapping(categoryId: number, brandId: number) {
    const mapping = await this.cbRepo.findOne({
      where: { category: { id: categoryId }, brand: { id: brandId } },
    });

    if (!mapping) throw new NotFoundException('Mapping not found');

    await this.cbRepo.remove(mapping);
    return { message: 'Mapping removed successfully' };
  }
}
