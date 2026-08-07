import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardMallCategoryDto } from './create-reward-mall-category.dto';

export class UpdateRewardMallCategoryDto extends PartialType(
  CreateRewardMallCategoryDto,
) {}
