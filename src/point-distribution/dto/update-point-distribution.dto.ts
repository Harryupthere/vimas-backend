import { PartialType } from '@nestjs/mapped-types';
import { CreatePointDistributionDto } from './create-point-distribution.dto';

export class UpdatePointDistributionDto extends PartialType(
  CreatePointDistributionDto,
) {}
