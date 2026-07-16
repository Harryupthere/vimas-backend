import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Deliberately NOT PartialType(CreateReviewRatingDto) — productId/orderId
// must never be editable after creation.
export class UpdateReviewRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rate?: number;

  @IsString()
  @IsOptional()
  review?: string;
}
