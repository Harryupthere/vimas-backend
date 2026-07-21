import { IsInt, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreatePointUserBalanceDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

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
