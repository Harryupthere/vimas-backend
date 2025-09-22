import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateRegistrationTypeDto {
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
