import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenAdminDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
