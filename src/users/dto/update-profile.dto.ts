import { IsEmail, IsNotEmpty, IsString, IsOptional,  Length, } from 'class-validator';

export class UpdateProfileDto {
 
  @IsOptional()
  //@IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  telegram_id: string;

  @IsOptional()
  phone_number: string;

    @IsString()
  @IsOptional()
  country: string;

    @IsString()
  @IsOptional()
  country_code: string;

    @IsOptional()
  @IsString()
  profile?: string;

    @IsString()
    @IsOptional()
   // @Length(2, 100)
    first_name: string;
  
    @IsOptional()
    @IsString()
   // @Length(2, 100)
    last_name?: string;
  


}
