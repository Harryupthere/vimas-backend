import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductMediaDto {
  @IsInt()
  product_id: number;

  @IsString()
  @IsNotEmpty()
  media_url: string;

  @IsEnum(['image', 'video'])
  @IsOptional()
  media_type?: 'image' | 'video' = 'image';

  @IsInt()
  @IsOptional()
  sort_order?: number = 0;
}
