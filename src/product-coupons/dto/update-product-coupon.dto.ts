import { PartialType } from '@nestjs/mapped-types';
import { CreateProductCouponDto } from './create-product-coupon.dto';

export class UpdateProductCouponDto extends PartialType(
  CreateProductCouponDto,
) {}
