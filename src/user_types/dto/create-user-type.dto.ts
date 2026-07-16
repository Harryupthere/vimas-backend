import { IsNotEmpty, IsOptional, IsString, IsInt, IsArray } from 'class-validator';

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

  @IsOptional()
  @IsString()
  icon?: string;

  // accept an array of strings from client
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  key_points?: string[];
}
