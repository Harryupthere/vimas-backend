import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
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

  // Total points (per unit) this product carries for the points-sharing
  // distribution (buyer/upline/pool split via PointDistribution rules).
  @IsOptional()
  @IsNumber()
  totalPoints?: number;

  // Order quantity bounds per cart_type — enforced by CartService.addToCart
  @IsOptional()
  @IsInt()
  @Min(0)
  consumerMinimumQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  consumerMaximumQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  resellerMinimumQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  resellerMaximumQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  partnerMinimumQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  partnerMaximumQuantity?: number;

  @IsOptional()
  @IsBoolean()
  showTotalPoints?: boolean;

  @IsOptional()
  @IsBoolean()
  showPointsSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  stockShow?: number;

  @IsNumber()
  stock: number;

  @IsOptional()
  @IsNumber()
  isOutOfStock: number;

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

  @IsOptional()
  status?: string;

  // Gates the reseller listing (GET /products?type=reseller)
  @IsOptional()
  @IsBoolean()
  bulkAvailable?: boolean;

  // Gates the consumer listing (GET /products?type=consumer). Defaults to
  // true (matches the column's DB default) when omitted.
  @IsOptional()
  @IsBoolean()
  consumerAvailable?: boolean;

  // Gates the partner listing (GET /products?type=partner). Defaults to
  // true (matches the column's DB default) when omitted.
  @IsOptional()
  @IsBoolean()
  partnerAvailable?: boolean;
}
