import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsIn([0, 1])
  @IsOptional()
  status?: number;

  @IsBoolean()
  @IsOptional()
  userPreference?: boolean;
}
