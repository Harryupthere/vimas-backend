import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// Query DTO for the buyer-facing checkout price helper — amount is the
// cart total in the store's fiat currency (MYR).
export class ConvertCryptoCurrencyDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  cryptoCurrencyId: number;
}
