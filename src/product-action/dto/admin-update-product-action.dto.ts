import { IsOptional, IsArray, IsString, IsInt } from 'class-validator';

export class AdminUpdateProductActionDto {
  @IsOptional()
  @IsInt()
  currentStatus?: number; // 0 or 1

  @IsOptional()
  @IsInt()
  currentStage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adminRemarks?: string[]; // admin reasons / notes
}
