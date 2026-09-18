import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  module?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  action?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}