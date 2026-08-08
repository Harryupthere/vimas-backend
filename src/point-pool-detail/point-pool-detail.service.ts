import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointPoolDetail } from '../shared/entities/point-pool-detail.entity';
import { CreatePointPoolDetailDto } from './dto/create-point-pool-detail.dto';
import { UpdatePointPoolDetailDto } from './dto/update-point-pool-detail.dto';

@Injectable()
export class PointPoolDetailService {
  constructor(
    @InjectRepository(PointPoolDetail)
    private readonly pointPoolDetailRepo: Repository<PointPoolDetail>,
  ) {}

  async create(dto: CreatePointPoolDetailDto) {
    const pointPoolDetail = this.pointPoolDetailRepo.create(dto);
    await this.pointPoolDetailRepo.save(pointPoolDetail);
    return {
      data: pointPoolDetail,
      message: 'Point pool detail created successfully',
    };
  }

  async findAll(status?: string, search?: string) {
    const query = this.pointPoolDetailRepo
      .createQueryBuilder('pointPoolDetail')
      .orderBy('pointPoolDetail.id', 'DESC');

    if (status) {
      query.andWhere('pointPoolDetail.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(pointPoolDetail.name LIKE :search OR pointPoolDetail.description LIKE :search OR pointPoolDetail.symbol LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Point pool details fetched successfully' };
  }

  async findOne(id: number) {
    const pointPoolDetail = await this.pointPoolDetailRepo.findOne({
      where: { id },
    });
    if (!pointPoolDetail)
      throw new NotFoundException('Point pool detail not found');
    return { data: pointPoolDetail, message: 'Point pool detail' };
  }

  async update(id: number, dto: UpdatePointPoolDetailDto) {
    const pointPoolDetail = await this.pointPoolDetailRepo.findOne({
      where: { id },
    });
    if (!pointPoolDetail)
      throw new NotFoundException('Point pool detail not found');

    Object.assign(pointPoolDetail, dto);
    await this.pointPoolDetailRepo.save(pointPoolDetail);
    return {
      data: pointPoolDetail,
      message: 'Point pool detail updated successfully',
    };
  }

  async remove(id: number) {
    const pointPoolDetail = await this.pointPoolDetailRepo.findOne({
      where: { id },
    });
    if (!pointPoolDetail)
      throw new NotFoundException('Point pool detail not found');

    try {
      await this.pointPoolDetailRepo.remove(pointPoolDetail);
      return { message: 'Point pool detail removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete a pool detail that has existing pools',
        );
      }
      throw err;
    }
  }
}
