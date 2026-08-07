import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RewardMallProductMediaType } from '../../shared/entities/reward-mall-product-media.entity';

export class CreateRewardMallProductMediaDto {
  @IsInt()
  rewardMallProductId: number;

  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @IsOptional()
  @IsEnum(RewardMallProductMediaType)
  mediaType?: RewardMallProductMediaType;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
