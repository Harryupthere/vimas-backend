import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateMembershipTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  // accept an array of strings from client
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  key_points?: string[];

  @IsOptional()
  @IsString()
  colour?: string;

  @IsOptional()
  @IsNumber()
  points_required?: number;
}
