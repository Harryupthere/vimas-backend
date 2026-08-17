import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductType } from '../../shared/enums/product-type.enum';
import { AddOnCalculationType } from '../../shared/entities/product-add-on.entity';

export class CreateProductAddOnDto {
  @IsInt()
  productId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsEnum(AddOnCalculationType)
  calculationType?: AddOnCalculationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  costPerUnit?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  applicableMinimumQuantity?: number;

  @IsOptional()
  @IsInt()
  isActive?: number;
}
