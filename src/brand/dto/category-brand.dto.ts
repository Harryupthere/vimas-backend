// dto/create-category-brand.dto.ts
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateCategoryBrandDto {
  @IsInt()
  @IsNotEmpty()
  category_id: number;

  @IsInt()
  @IsNotEmpty()
  brand_id: number;
}
