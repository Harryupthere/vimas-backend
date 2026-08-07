import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardMallPurchaseStatusDto } from './create-reward-mall-purchase-status.dto';

export class UpdateRewardMallPurchaseStatusDto extends PartialType(
  CreateRewardMallPurchaseStatusDto,
) {}
