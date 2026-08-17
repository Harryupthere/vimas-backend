// Deliberately dependency-free (no imports) — cart.entity.ts, user.entity.ts
// and order.entity.ts form a require cycle (cart -> user -> order -> cart),
// and order.entity.ts uses this enum eagerly inside a @Column decorator
// (`enum: CartType, default: CartType.CONSUMER`), not inside a lazy relation
// thunk. If CartType lived inside cart.entity.ts, whichever file enters that
// cycle first could still be mid-load (CartType not yet assigned) by the
// time order.entity.ts's decorator runs, leaving `enum` as `undefined` and
// silently breaking TypeORM's metadata for Order ("No metadata for Order
// was found"). Living in its own leaf file, CartType is always fully
// defined before anything in the cycle can request it.
export enum CartType {
  CONSUMER = 'consumer',
  RESELLER = 'reseller',
  PARTNER = 'partner',
}
