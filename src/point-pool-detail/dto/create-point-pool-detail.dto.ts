import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  PointPoolDetailStatus,
  PointPoolDetailType,
} from '../../shared/entities/point-pool-detail.entity';

export class CreatePointPoolDetailDto {
  @IsEnum(PointPoolDetailType)
  type: PointPoolDetailType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  colour?: string;

  @IsEnum(PointPoolDetailStatus)
  @IsOptional()
  status?: PointPoolDetailStatus;
}
