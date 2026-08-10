import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationCategoryDto } from './create-notification-category.dto';

export class UpdateNotificationCategoryDto extends PartialType(
  CreateNotificationCategoryDto,
) {}
