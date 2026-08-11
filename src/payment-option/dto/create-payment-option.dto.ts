import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentOptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  note?: string[];

  @IsOptional()
  charges?: number;

  @IsIn([0, 1])
  @IsOptional()
  status?: number;
}
