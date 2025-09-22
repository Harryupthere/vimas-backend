import { IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
