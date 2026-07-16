import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePaymentStatusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  colour?: string;

  @IsObject()
  @IsOptional()
  remark?: Record<string, any>;
}
