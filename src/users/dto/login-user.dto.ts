import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginUserDto {
  @IsOptional()
  //@IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsString()
  @IsOptional()
  telegram_id: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsNotEmpty()
  login_type: number;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  device_id?: string;
}
