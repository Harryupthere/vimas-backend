import { IsEnum } from 'class-validator';
import { ProductFeedbackStatus } from '../../shared/entities/product-feedback.entity';

export class SetFeedbackStatusDto {
  @IsEnum(ProductFeedbackStatus)
  status: ProductFeedbackStatus;
}
