import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  remark?: Record<string, any>;
}
