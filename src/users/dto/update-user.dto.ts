import { IsEmail, IsNotEmpty, IsString, IsOptional,  Length,MinLength } from 'class-validator';


export class UpdateUserDto  {
    @IsOptional()
  //@IsEmail()
  is_admin_deleted: number;

  @IsString()
  @IsOptional()
  admin_deleted_reason: string;

  @IsOptional()
  status: number;

 @IsOptional()
  @IsString()
  @MinLength(8)
  password: string;
}
