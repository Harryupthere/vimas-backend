import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointAdminBalance } from '../shared/entities/point-admin-balance.entity';
import { CreatePointAdminBalanceDto } from './dto/create-point-admin-balance.dto';
import { UpdatePointAdminBalanceDto } from './dto/update-point-admin-balance.dto';

@Injectable()
export class PointAdminBalanceService {
  constructor(
    @InjectRepository(PointAdminBalance)
    private readonly pointAdminBalanceRepo: Repository<PointAdminBalance>,
  ) {}

  async create(dto: CreatePointAdminBalanceDto) {
    try {
      const balance = this.pointAdminBalanceRepo.create(dto);
      await this.pointAdminBalanceRepo.save(balance);
      return {
        data: balance,
        message: 'Point admin balance created successfully',
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A point balance record already exists for this admin',
        );
      }
      throw err;
    }
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await this.pointAdminBalanceRepo.findAndCount({
      relations: ['admin'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: {
        balances: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Point admin balances fetched successfully',
    };
  }

  async findOne(id: number) {
    const balance = await this.pointAdminBalanceRepo.findOne({
      where: { id },
      relations: ['admin'],
    });
    if (!balance) throw new NotFoundException('Point admin balance not found');
    return { data: balance, message: 'Point admin balance' };
  }

  async update(id: number, dto: UpdatePointAdminBalanceDto) {
    const balance = await this.pointAdminBalanceRepo.findOne({
      where: { id },
    });
    if (!balance) throw new NotFoundException('Point admin balance not found');

    Object.assign(balance, dto);
    await this.pointAdminBalanceRepo.save(balance);
    return {
      data: balance,
      message: 'Point admin balance updated successfully',
    };
  }

  async remove(id: number) {
    const balance = await this.pointAdminBalanceRepo.findOne({
      where: { id },
    });
    if (!balance) throw new NotFoundException('Point admin balance not found');

    await this.pointAdminBalanceRepo.remove(balance);
    return { message: 'Point admin balance removed successfully' };
  }
}
