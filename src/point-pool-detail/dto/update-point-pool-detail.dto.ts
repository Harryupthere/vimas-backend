import { PartialType } from '@nestjs/mapped-types';
import { CreatePointPoolDetailDto } from './create-point-pool-detail.dto';

export class UpdatePointPoolDetailDto extends PartialType(
  CreatePointPoolDetailDto,
) {}
