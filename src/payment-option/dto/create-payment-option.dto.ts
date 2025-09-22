import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
