import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentOptionDto } from './create-payment-option.dto';

export class UpdatePaymentOptionDto extends PartialType(
  CreatePaymentOptionDto,
) {}
