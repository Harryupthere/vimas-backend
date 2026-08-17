import { CartType } from '../entities/cart.entity';
import { ProductType } from '../enums/product-type.enum';

// Cart/Order carry product type as the lowercase CartType enum
// (consumer/reseller/partner) — the single existing source of truth for
// "what type of purchase is this". The new pricing config tables
// (product_extra_charges/add_ons/coupons/discounts) store it as the
// uppercase ProductType enum instead. This maps one to the other rather
// than introducing a second way to determine product type.
const CART_TYPE_TO_PRODUCT_TYPE: Record<CartType, ProductType> = {
  [CartType.CONSUMER]: ProductType.CONSUMER,
  [CartType.RESELLER]: ProductType.RESELLER,
  [CartType.PARTNER]: ProductType.PARTNER,
};

export function toProductType(cartType: CartType): ProductType {
  return CART_TYPE_TO_PRODUCT_TYPE[cartType];
}
