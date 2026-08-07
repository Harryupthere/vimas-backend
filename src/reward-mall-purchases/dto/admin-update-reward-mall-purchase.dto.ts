import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class AdminUpdateRewardMallPurchaseDto {
  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adminRemark?: string[];

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}
