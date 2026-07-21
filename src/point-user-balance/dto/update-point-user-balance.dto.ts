import { IsNumber, IsOptional } from 'class-validator';

// Deliberately not PartialType(Create) — userId must never be reassigned on
// an existing balance row via update.
export class UpdatePointUserBalanceDto {
  @IsNumber()
  @IsOptional()
  totalCredit?: number;

  @IsNumber()
  @IsOptional()
  totalDebit?: number;

  @IsNumber()
  @IsOptional()
  currentBalance?: number;
}
