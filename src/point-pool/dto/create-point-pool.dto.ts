import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { PointPoolStatus } from '../../shared/entities/point-pool.entity';

export class CreatePointPoolDto {
  @IsInt()
  @IsNotEmpty()
  poolDetailId: number;

  @IsDateString()
  fromDatetime: string;

  @IsDateString()
  toDatetime: string;

  @IsInt()
  @IsOptional()
  totalUsers?: number;

  @IsInt()
  @IsOptional()
  totalAdmins?: number;

  @IsNumber()
  @IsOptional()
  totalCredit?: number;

  @IsNumber()
  @IsOptional()
  totalDebit?: number;

  @IsNumber()
  @IsOptional()
  currentBalance?: number;

  @IsNumber()
  @IsOptional()
  distributedPoints?: number;

  @IsEnum(PointPoolStatus)
  @IsOptional()
  status?: PointPoolStatus;
}
