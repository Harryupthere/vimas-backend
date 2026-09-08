import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductType } from '../../shared/enums/product-type.enum';
import {
  ChargeCalculationBasis,
  ChargeCalculationType,
} from '../../shared/entities/product-extra-charge.entity';

export class CreateProductExtraChargeDto {
  @IsInt()
  productId: number;

  @IsInt()
  paymentOptionId: number;

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
  @IsEnum(ChargeCalculationBasis)
  calculationBasis?: ChargeCalculationBasis;

  @IsOptional()
  @IsEnum(ChargeCalculationType)
  calculationType?: ChargeCalculationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsEnum(ChargeCalculationBasis)
  fixedAmountBasis?: ChargeCalculationBasis;

  @IsOptional()
  @IsInt()
  @Min(0)
  waiveAtQuantity?: number;

  @IsOptional()
  @IsInt()
  isActive?: number;
}
