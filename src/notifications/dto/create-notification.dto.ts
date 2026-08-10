import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

// Admin "send a notification" payload — either target a single user via
// userId, or fan it out to every active user via broadcast: true. The
// service enforces exactly one of the two is set.
export class CreateNotificationDto {
  @IsInt()
  @IsOptional()
  userId?: number;

  @IsBoolean()
  @IsOptional()
  broadcast?: boolean;

  @IsInt()
  @IsNotEmpty()
  notificationCategoryId: number;

  @IsInt()
  @IsNotEmpty()
  notificationTypeId: number;

  @IsString()
  @IsNotEmpty()
  heading: string;

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
