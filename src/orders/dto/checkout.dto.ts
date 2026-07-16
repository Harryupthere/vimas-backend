import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CheckoutDto {
  @IsInt()
  @IsNotEmpty()
  contactInfoId: number;

  @IsInt()
  @IsOptional()
  paymentOptionId?: number;
}
