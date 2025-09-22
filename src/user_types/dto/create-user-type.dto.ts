import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateUserTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
