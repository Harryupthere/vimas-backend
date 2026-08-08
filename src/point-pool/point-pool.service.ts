import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointPool } from '../shared/entities/point-pool.entity';
import { CreatePointPoolDto } from './dto/create-point-pool.dto';
import { UpdatePointPoolDto } from './dto/update-point-pool.dto';

@Injectable()
export class PointPoolService {
  constructor(
    @InjectRepository(PointPool)
    private readonly pointPoolRepo: Repository<PointPool>,
  ) {}

  async create(dto: CreatePointPoolDto) {
    const pointPool = this.pointPoolRepo.create(dto);
    await this.pointPoolRepo.save(pointPool);
    return { data: pointPool, message: 'Point pool created successfully' };
  }

  async findAll(page: number, limit: number, status?: string, search?: string) {
    const query = this.pointPoolRepo
      .createQueryBuilder('pointPool')
      .leftJoinAndSelect('pointPool.poolDetail', 'poolDetail')
      .orderBy('pointPool.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere('pointPool.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(poolDetail.name LIKE :search OR poolDetail.description LIKE :search OR poolDetail.symbol LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        pools: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Point pools fetched successfully',
    };
  }

  async findOne(id: number) {
    const pointPool = await this.pointPoolRepo.findOne({
      where: { id },
      relations: ['poolDetail'],
    });
    if (!pointPool) throw new NotFoundException('Point pool not found');
    return { data: pointPool, message: 'Point pool' };
  }

  async update(id: number, dto: UpdatePointPoolDto) {
    const pointPool = await this.pointPoolRepo.findOne({ where: { id } });
    if (!pointPool) throw new NotFoundException('Point pool not found');

    Object.assign(pointPool, dto);
    await this.pointPoolRepo.save(pointPool);
    return { data: pointPool, message: 'Point pool updated successfully' };
  }

  async remove(id: number) {
    const pointPool = await this.pointPoolRepo.findOne({ where: { id } });
    if (!pointPool) throw new NotFoundException('Point pool not found');

    await this.pointPoolRepo.remove(pointPool);
    return { message: 'Point pool removed successfully' };
  }
}
