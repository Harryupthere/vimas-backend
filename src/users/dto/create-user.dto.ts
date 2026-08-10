import {
  IsOptional,
  IsString,
  Length,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  last_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  telegram_id?: string;

  // Username/password registration
  @IsOptional()
  @IsString()
  @Length(3, 100)
  username?: string;

  // Username of the user who referred this signup
  @IsOptional()
  @IsString()
  referred_username?: string;

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

  // Username of the user who referred this signup — the frontend collects
  // the referral's username, not their id, so lookup in UsersService.create
  // resolves this to a user record rather than taking an id directly.
  @IsOptional()
  @IsString()
  referral_username?: string;

  @IsOptional()
  @IsInt()
  user_type_id?: number;

  @IsOptional()
  @IsInt()
  registration_type_id?: number;

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
