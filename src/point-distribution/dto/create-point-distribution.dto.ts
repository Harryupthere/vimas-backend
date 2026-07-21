import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  PointDistributionStatus,
  PointEventType,
  PointReceiverType,
} from '../../shared/entities/point-distribution.entity';

export class CreatePointDistributionDto {
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

  @IsEnum(PointEventType)
  eventType: PointEventType;

  @IsEnum(PointReceiverType)
  receiverType: PointReceiverType;

  @IsNumber()
  points: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  priority?: number;

  @IsEnum(PointDistributionStatus)
  @IsOptional()
  status?: PointDistributionStatus;
}
