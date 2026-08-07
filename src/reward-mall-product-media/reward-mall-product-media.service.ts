import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardMallProductMedia } from '../shared/entities/reward-mall-product-media.entity';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { CreateRewardMallProductMediaDto } from './dto/create-reward-mall-product-media.dto';
import { UpdateRewardMallProductMediaDto } from './dto/update-reward-mall-product-media.dto';

@Injectable()
export class RewardMallProductMediaService {
  constructor(
    @InjectRepository(RewardMallProductMedia)
    private readonly mediaRepo: Repository<RewardMallProductMedia>,

    @InjectRepository(RewardMallProduct)
    private readonly productRepo: Repository<RewardMallProduct>,
  ) {}

  async create(dto: CreateRewardMallProductMediaDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.rewardMallProductId },
    });
    if (!product) throw new NotFoundException('Reward mall product not found');

    const media = this.mediaRepo.create(dto);
    await this.mediaRepo.save(media);
    return { data: media, message: 'Media created successfully' };
  }

  async findAll(rewardMallProductId: number) {
    const data = await this.mediaRepo.find({
      where: { rewardMallProductId },
      order: { sortOrder: 'ASC' },
    });
    return { data, message: 'Media fetched successfully' };
  }

  async update(id: number, dto: UpdateRewardMallProductMediaDto) {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    if (dto.rewardMallProductId) {
      const product = await this.productRepo.findOne({
        where: { id: dto.rewardMallProductId },
      });
      if (!product)
        throw new NotFoundException('Reward mall product not found');
    }

    Object.assign(media, dto);
    await this.mediaRepo.save(media);
    return { data: media, message: 'Media updated successfully' };
  }

  async remove(id: number) {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    await this.mediaRepo.remove(media);
    return { message: 'Media removed successfully' };
  }
}
