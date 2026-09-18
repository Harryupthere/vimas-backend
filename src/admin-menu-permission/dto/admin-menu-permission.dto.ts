import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateAdminMenuPermissionsDto {
  @IsArray()
  @IsNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  permissionIds: number[];
}
