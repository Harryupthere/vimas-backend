import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateProductFeedbackDto {
  @IsInt()
  productId: number;

  // present => this feedback is a reply to another feedback row
  @IsOptional()
  @IsInt()
  parentFeedbackId?: number;

  // ignored for replies — rating only applies to a top-level product review
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsNotEmpty()
  @IsString()
  comment: string;
}
