import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  // Legacy flat points-per-unit value — no longer used by the distribution
  // calculation, kept only for backward compatibility. Optional now that
  // pointsPercentage drives the actual crediting.
  @IsOptional()
  @IsNumber()
  points?: number;

  // Share (0-100) of the purchased product's total_points this receiver
  // gets. This is what the distribution queue actually uses.
  @IsNumber()
  @Min(0)
  @Max(100)
  pointsPercentage: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  priority?: number;

  @IsEnum(PointDistributionStatus)
  @IsOptional()
  status?: PointDistributionStatus;
}
