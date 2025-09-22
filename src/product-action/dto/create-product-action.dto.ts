import { IsInt, IsOptional, IsArray, IsString } from 'class-validator';

export class CreateProductActionDto {
  @IsInt()
  productId: number;

  @IsOptional()
  @IsInt()
  currentStage?: number; // 0 or 1

  @IsOptional()
  @IsInt()
  attemptType?: number; // 0 or 1

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  merchantRemarks?: string[]; // optional initial remarks from merchant
}
