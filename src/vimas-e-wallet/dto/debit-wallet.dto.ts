import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DebitWalletDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
