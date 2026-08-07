import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardMallProductMediaDto } from './create-reward-mall-product-media.dto';

export class UpdateRewardMallProductMediaDto extends PartialType(
  CreateRewardMallProductMediaDto,
) {}
