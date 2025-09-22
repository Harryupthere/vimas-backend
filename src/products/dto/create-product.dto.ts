import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
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
  sellingPrice: number;

  @IsOptional()
  @IsBoolean()
  discountAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsBoolean()
  stockShow?: number;

  @IsNumber()
  stock: number;

  @IsOptional()
  @IsBoolean()
  labelShow?: boolean;

  @IsOptional()
  @IsString()
  labelText?: string;

  @IsOptional()
  @IsString()
  labelColor?: string;

  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  // @IsNumber()
  // merchantId: number;
}
