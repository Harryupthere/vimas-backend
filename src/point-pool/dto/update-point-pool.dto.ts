import { PartialType } from '@nestjs/mapped-types';
import { CreatePointPoolDto } from './create-point-pool.dto';

export class UpdatePointPoolDto extends PartialType(CreatePointPoolDto) {}
