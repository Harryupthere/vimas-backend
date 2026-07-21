import { IsInt, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreatePointAdminBalanceDto {
  @IsInt()
  @IsNotEmpty()
  adminId: number;

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
