import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardMallPurchaseStatus } from '../shared/entities/reward-mall-purchase-status.entity';
import { CreateRewardMallPurchaseStatusDto } from './dto/create-reward-mall-purchase-status.dto';
import { UpdateRewardMallPurchaseStatusDto } from './dto/update-reward-mall-purchase-status.dto';

@Injectable()
export class RewardMallPurchaseStatusService {
  constructor(
    @InjectRepository(RewardMallPurchaseStatus)
    private readonly statusRepo: Repository<RewardMallPurchaseStatus>,
  ) {}

  async create(dto: CreateRewardMallPurchaseStatusDto) {
    const status = this.statusRepo.create(dto);
    await this.statusRepo.save(status);
    return {
      data: status,
      message: 'Reward mall purchase status created successfully',
    };
  }

  async findAll() {
    const data = await this.statusRepo.find({ order: { id: 'ASC' } });
    return {
      data,
      message: 'Reward mall purchase statuses fetched successfully',
    };
  }

  async findOne(id: number) {
    const status = await this.statusRepo.findOne({ where: { id } });
    if (!status)
      throw new NotFoundException('Reward mall purchase status not found');
    return { data: status, message: 'Reward mall purchase status' };
  }

  async update(id: number, dto: UpdateRewardMallPurchaseStatusDto) {
    const status = await this.statusRepo.findOne({ where: { id } });
    if (!status)
      throw new NotFoundException('Reward mall purchase status not found');

    Object.assign(status, dto);
    await this.statusRepo.save(status);
    return {
      data: status,
      message: 'Reward mall purchase status updated successfully',
    };
  }

  async remove(id: number) {
    const status = await this.statusRepo.findOne({ where: { id } });
    if (!status)
      throw new NotFoundException('Reward mall purchase status not found');

    try {
      await this.statusRepo.remove(status);
      return { message: 'Reward mall purchase status removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete a status that is used by existing reward mall purchases',
        );
      }
      throw err;
    }
  }
}
