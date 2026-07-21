import { IsNumber, IsOptional } from 'class-validator';

// Deliberately not PartialType(Create) — adminId must never be reassigned on
// an existing balance row via update.
export class UpdatePointAdminBalanceDto {
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
