import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  first_name: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  last_name?: string;

  //@IsEmail()
  //@IsNotEmpty()
  email: string;

  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  telegram_id?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone_number?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  country_code?: string;

  @IsOptional()
  @IsString()
  profile?: string;

  @IsOptional()
  @IsInt()
  referral_id?: number;

  @IsNotEmpty()
  @IsInt()
  user_type_id: number;

  @IsNotEmpty()
  @IsInt()
  registration_type_id: number;
}
