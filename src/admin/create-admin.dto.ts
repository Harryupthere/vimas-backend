import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateAdminDto {
  @IsEmail()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  adminRoleId: number;
}