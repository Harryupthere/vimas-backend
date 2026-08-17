import { PartialType } from '@nestjs/mapped-types';
import { CreateProductExtraChargeDto } from './create-product-extra-charge.dto';

export class UpdateProductExtraChargeDto extends PartialType(
  CreateProductExtraChargeDto,
) {}
