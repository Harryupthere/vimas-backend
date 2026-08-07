import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CartType } from '../../shared/entities/cart.entity';

export class AddToCartDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  // frontend sends this explicitly; defaults to 'consumer' when omitted
  @IsOptional()
  @IsEnum(CartType)
  cart_type?: CartType;

  // Which product_bulk_details package this line is for — required when
  // cart_type is 'reseller', ignored for 'consumer'.
  @IsOptional()
  @IsInt()
  productBulkDetailsId?: number;
}

export class UpdateCartDto {
  @IsInt()
  @Min(1)
  quantity: number;

  // Disambiguates which of the buyer's rows (consumer vs reseller) for this
  // product to update — defaults to 'consumer' when omitted.
  @IsOptional()
  @IsEnum(CartType)
  cart_type?: CartType;

  // Only meaningful when cart_type is 'reseller' — lets the buyer switch
  // which bulk package this row is for.
  @IsOptional()
  @IsInt()
  productBulkDetailsId?: number;
}
