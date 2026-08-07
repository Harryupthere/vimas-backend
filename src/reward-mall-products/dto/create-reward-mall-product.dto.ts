import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRewardMallProductDto {
  @IsInt()
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  subTitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  information?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  keyPoints?: string[];

  @IsOptional()
  details?: Record<string, any>[];

  @IsOptional()
  @IsArray()
  searchKeywords?: string[];

  @IsNumber()
  @Min(0)
  pointPrice: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maximumQuantity?: number;

  @IsOptional()
  @IsBoolean()
  stockShow?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isOutOfStock?: boolean;

  @IsOptional()
  @IsBoolean()
  labelShow?: boolean;

  @IsOptional()
  @IsString()
  labelText?: string;

  @IsOptional()
  @IsString()
  labelColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
