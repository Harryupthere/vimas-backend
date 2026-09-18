import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  module: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  action: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}