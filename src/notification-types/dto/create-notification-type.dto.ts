import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @IsIn([0, 1])
  @IsOptional()
  status?: number;
}
