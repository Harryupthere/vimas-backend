import { IsEmail, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAdminDto {
  @IsEmail()
  @IsOptional()
  username?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  adminRoleId?: number;
}
