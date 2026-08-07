import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardMallProductDto } from './create-reward-mall-product.dto';

export class UpdateRewardMallProductDto extends PartialType(
  CreateRewardMallProductDto,
) {}
