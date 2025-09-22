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

  @IsNotEmpty()
  login_type: number;
}
