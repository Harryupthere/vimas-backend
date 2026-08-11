import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CheckoutDto {
  @IsInt()
  @IsNotEmpty()
  contactInfoId: number;

  @IsInt()
  @IsOptional()
  paymentOptionId?: number;

  // Required only when the selected paymentOptionId resolves to the
  // CoinPayments payment option — which crypto currency to invoice in.
  @IsInt()
  @IsOptional()
  cryptoCurrencyId?: number;
}
