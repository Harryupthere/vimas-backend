import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsInt,
  MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsInt()
  @IsOptional()
  parent_id: number;
}
