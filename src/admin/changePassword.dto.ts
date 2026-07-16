import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangePasswordAdminDto {

  @IsString()
  @MinLength(6)
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
