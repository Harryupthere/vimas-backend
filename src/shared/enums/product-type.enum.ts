// Product-type enum used by the product pricing config tables
// (product_extra_charges, product_add_ons, product_coupons,
// product_discounts). Deliberately uppercase to match the DB enum in
// Vimas-club-latest.sql — distinct from CartType (cart.entity.ts), which is
// lowercase and used by cart/orders. See shared/utils/product-type.util.ts
// for the mapping between the two.
export enum ProductType {
  CONSUMER = 'CONSUMER',
  PARTNER = 'PARTNER',
  RESELLER = 'RESELLER',
}
