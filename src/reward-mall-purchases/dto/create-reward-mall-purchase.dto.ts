import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRewardMallPurchaseDto {
  @IsInt()
  rewardMallProductId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userRemark?: string[];
}
