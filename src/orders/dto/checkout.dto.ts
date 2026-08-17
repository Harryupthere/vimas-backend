import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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

  // Selections/intent only — the backend looks up each of these in the DB
  // and computes the actual amounts itself (see CheckoutPricingService).
  // No prices/discounts/amounts are ever accepted from the client.
  // One code per product — each is matched to its own cart item and
  // validated independently; two codes may not target the same product.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  couponCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  addOnIds?: number[];

  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;
}
