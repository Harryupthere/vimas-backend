import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProductFeedbackDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
