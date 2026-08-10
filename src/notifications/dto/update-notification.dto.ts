import { IsObject, IsOptional, IsString } from 'class-validator';

// Admin edit — only the display content is mutable after the fact; the
// target user / category / type are fixed at creation time.
export class UpdateNotificationDto {
  @IsString()
  @IsOptional()
  heading?: string;

  @IsString()
  @IsOptional()
  subheading?: string;

  @IsString()
  @IsOptional()
  route?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
