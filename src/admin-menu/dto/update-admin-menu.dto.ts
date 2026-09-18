import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { AdminMenuType } from "../../shared/entities/admin-menu.entity";

export class UpdateAdminMenuDto {
  @IsInt()
  @IsOptional()
  parent_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  route?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  feature_key?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  @IsEnum(AdminMenuType)
  @IsOptional()
  menu_type?: AdminMenuType;

  @IsInt()
  @IsOptional()
  sort_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
