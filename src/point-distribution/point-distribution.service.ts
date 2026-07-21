import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointDistribution } from '../shared/entities/point-distribution.entity';
import { CreatePointDistributionDto } from './dto/create-point-distribution.dto';
import { UpdatePointDistributionDto } from './dto/update-point-distribution.dto';

@Injectable()
export class PointDistributionService {
  constructor(
    @InjectRepository(PointDistribution)
    private readonly pointDistributionRepo: Repository<PointDistribution>,
  ) {}

  async create(dto: CreatePointDistributionDto) {
    const pointDistribution = this.pointDistributionRepo.create(dto);
    await this.pointDistributionRepo.save(pointDistribution);
    return {
      data: pointDistribution,
      message: 'Point distribution rule created successfully',
    };
  }

  async findAll(status?: string) {
    const where = status ? { status: status as any } : {};
    const data = await this.pointDistributionRepo.find({
      where,
      order: { priority: 'ASC', id: 'DESC' },
    });
    return { data, message: 'Point distribution rules fetched successfully' };
  }

  async findOne(id: number) {
    const pointDistribution = await this.pointDistributionRepo.findOne({
      where: { id },
    });
    if (!pointDistribution)
      throw new NotFoundException('Point distribution rule not found');
    return { data: pointDistribution, message: 'Point distribution rule' };
  }

  async update(id: number, dto: UpdatePointDistributionDto) {
    const pointDistribution = await this.pointDistributionRepo.findOne({
      where: { id },
    });
    if (!pointDistribution)
      throw new NotFoundException('Point distribution rule not found');

    Object.assign(pointDistribution, dto);
    await this.pointDistributionRepo.save(pointDistribution);
    return {
      data: pointDistribution,
      message: 'Point distribution rule updated successfully',
    };
  }

  async remove(id: number) {
    const pointDistribution = await this.pointDistributionRepo.findOne({
      where: { id },
    });
    if (!pointDistribution)
      throw new NotFoundException('Point distribution rule not found');

    await this.pointDistributionRepo.remove(pointDistribution);
    return { message: 'Point distribution rule removed successfully' };
  }
}
