import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRewardMallPurchaseStatusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  colour?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
