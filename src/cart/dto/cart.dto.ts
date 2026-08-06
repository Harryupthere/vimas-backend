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
}

export class UpdateCartDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
