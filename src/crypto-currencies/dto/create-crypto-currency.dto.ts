import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCryptoCurrencyDto {
  @IsString()
  @IsNotEmpty()
  coinpaymentId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsInt()
  @IsOptional()
  decimalPlaces?: number;

  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @IsString()
  @IsOptional()
  explorerUrl?: string;

  // Fiat currency this coin is rate-quoted against — should match the
  // store's charge currency (COINPAYMENTS_BASE_CURRENCY / STRIPE_CURRENCY)
  @IsString()
  @IsOptional()
  priceCurrencyId?: string;

  @IsIn([0, 1])
  @IsOptional()
  status?: number;
}
