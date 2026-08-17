import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDiscountDto } from './create-product-discount.dto';

export class UpdateProductDiscountDto extends PartialType(
  CreateProductDiscountDto,
) {}
