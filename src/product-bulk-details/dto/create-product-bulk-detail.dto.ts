import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductBulkDetailDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(0)
  packageQuantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPoints?: number;

  @IsOptional()
  @IsBoolean()
  showTotalPoints?: boolean;

  @IsOptional()
  @IsBoolean()
  showPointsSharing?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
