# VIMAS PROJECT LOGIC

Developer-to-developer reference for the VIMAS backend (NestJS + TypeORM + MySQL).
This document describes what the code in this repository actually does. It is not a
setup guide. Every claim below is traceable to a specific file; where the code is
incomplete, contradictory, or silent, that is stated explicitly instead of guessed.

Legend used throughout this document:
- `CURRENT IMPLEMENTATION` — what the code does today.
- `BUSINESS LOGIC` — the intent that can be inferred from code/comments.
- `PARTIALLY IMPLEMENTED` — some of the flow exists, some doesn't.
- `REFERENCED / NOT FULLY IMPLEMENTED` — a table/column/enum exists but nothing
  in the code acts on it.
- `NOT FOUND IN CURRENT CODEBASE` — searched for, not present.

---

## 1. Project Overview

VIMAS is a NestJS 11 / TypeORM 0.3 / MySQL backend for a points-driven e-commerce
platform (`src/app.module.ts`). There is a single unified `products` table
(`src/shared/entities/products.entity.ts`) that is sold through **three purchase
channels** distinguished by a `CartType`/`ProductType` value (`consumer`,
`reseller`, `partner`) rather than three separate product catalogs. Purchases route
through a shared `cart` → `orders` → `order_snapshots` pipeline
(`src/cart/cart.service.ts`, `src/orders/orders.service.ts`), and paid orders that
are not partner-flagged feed an asynchronous points-distribution pipeline built on
Bull/Redis (`src/point-distribution/`). Users can spend accumulated points in a
separate "Reward Mall" catalog (`src/reward-mall-products/`,
`src/reward-mall-purchases/`). There is also a store-credit wallet
(`vimas_e_wallet_*`, `src/vimas-e-wallet/`) usable only against normal checkout,
not the Reward Mall.

Payment gateways: Stripe (`src/stripe/`) and CoinPayments (`src/coinpayments/`),
selected per `payment_options` row (`src/shared/entities/payment-option.entity.ts`).

---

## 2. Core Business Model

### 2.1 Consumer

**CURRENT IMPLEMENTATION**: A product row with `consumer_available = 1` is listed
under `GET /products?type=consumer`. A buyer adds it to `cart` with
`cart_type = 'consumer'`; quantity is bounded by
`products.consumer_minimum_quantity` / `consumer_maximum_quantity` (defaults 1 / 9).
One consumer cart row per product per buyer (see §9 Cart Logic).

### 2.2 Reseller

**CURRENT IMPLEMENTATION**: Reseller purchasing is **not** a separate product
catalog — it is the *same* `products` row (gated by `bulk_available = 1`) sold via
**bulk packages** defined in a child table, `product_bulk_details`
(`src/shared/entities/product-bulk-detail.entity.ts`). Each package fixes a
`package_quantity`, `unit_price`, `discount_percentage`, `free_quantity`, `fees`,
`total_price`, and its own `total_points`. A reseller cart line references a
specific `product_bulk_details.id`; the cart row's `quantity` is a **package
count**, not a physical unit count (see `cart.service.ts` comments). Quantity is
bounded by `products.reseller_minimum_quantity` / `reseller_maximum_quantity`
(defaults 1 / 1), summed across *all* packages the buyer holds for that product.

There is no `resellers` or `reseller_packages` table — "reseller" is a `CartType`
enum value plus these bulk-detail rows.

### 2.3 Partner

**CURRENT IMPLEMENTATION**: Also the *same* `products` row (gated by
`partner_available = 1`), sold via `cart_type = 'partner'`. There is **no**
separate "external platform" table, no external-owner/vendor entity, and no
commission/revenue-split table anywhere in the schema. `partnerMinimumQuantity`/
`partnerMaximumQuantity` (defaults 1 / 1) bound quantity exactly like consumer.

**BUSINESS LOGIC** (per task description): partner products represent third-party
offerings promoted through VIMAS, with VIMAS possibly earning a commission.
**CURRENT IMPLEMENTATION vs BUSINESS INTENT**: none of that exists in code. The
only distinguishing behavior implemented for `partner` is:
1. It is mutually exclusive with `consumer`/`reseller` in the cart for the same
   product (`CartService.addToCart` throws if a conflicting row exists).
2. Orders for products flagged `partnerAvailable = 1` are **excluded from point
   distribution** (`OrdersService.finalizeOrdersAsPaid`, see §5 and Known Gap #1).
3. No commission/external-reference/revenue-split fields exist on `products`,
   `orders`, or anywhere else.

`REFERENCED / NOT FULLY IMPLEMENTED`: external ownership, commission logic,
external references — none found in the codebase.

---

## 3. Consumer Purchase Logic

Code: [`src/cart/cart.service.ts`](src/cart/cart.service.ts),
[`src/orders/orders.service.ts`](src/orders/orders.service.ts),
[`src/orders/checkout-pricing.service.ts`](src/orders/checkout-pricing.service.ts).

**Quantity enforcement is implemented at two layers, both server-side:**

1. **Add-to-cart / update-cart** (`CartService.getQuantityBounds`,
   `addToCart`, `updateCartItem`): the *total* quantity across all of a buyer's
   cart rows for that product+type must fall within
   `[consumer_minimum_quantity, consumer_maximum_quantity]`. E.g. if admin sets
   `consumer_maximum_quantity = 9`, a second `addToCart` call that would push the
   buyer's running total for that product above 9 is rejected with
   `BadRequestException`.
2. **Checkout re-validation** (`OrdersService.checkout`, lines ~166–197): bounds
   are re-checked against the *live* product row at checkout time (not just at
   add-to-cart time), because the admin may have lowered the max after the item
   was added to the cart.

There is **no database-level CHECK constraint** enforcing these bounds — enforcement
is entirely application-level (`NOT FOUND IN CURRENT CODEBASE` for a DB constraint).
There is also no decrement of `products.stock` anywhere in the checkout flow — see
Known Gap #4.

Pricing (subtotal, extra charges, add-ons, discounts, coupon, wallet) is computed
exclusively by `CheckoutPricingService.calculate` — see §10/§12/§14.

---

## 4. Reseller Logic

Code: [`src/product-bulk-details/`](src/product-bulk-details),
`CartService` (reseller branches), `CheckoutPricingService` (reseller branch),
`PointDistributionQueueService`.

- **Package definition** (`ProductBulkDetailsService.create`, admin-only): admin
  attaches one or more `product_bulk_details` rows to a `products` row. Each
  package has a unique `(product_id, package_quantity)` pair
  (`@Unique(['productId','packageQuantity'])`).
- **Buyer browsing**: `ProductBulkDetailsService.findPackagesForProduct` (a
  minimal id/quantity/price picker) and `findOneForProduct` (full row, scoped to
  the product so one product's package id can't be probed against another).
- **Cart**: `CartService.addToCart` with `cart_type = 'reseller'` requires
  `productBulkDetailsId`; the package must exist, belong to the product, and have
  `status = 1`. A buyer may hold multiple reseller cart rows for the same product
  — one per distinct package — because `cart_type` + `productBulkDetailsId` are
  part of the row's identity (DB-level generated column
  `product_bulk_details_key = COALESCE(product_bulk_details_id, 0)`, added by raw
  SQL rather than a TypeORM migration, per the entity's comment).
- **Pricing**: `CheckoutPricingService.calculate` — for a reseller line, unit price
  is the package's live `total_price` (not the product's `sellingPrice`), and
  `subtotal = unitPrice * quantity` where `quantity` = package count.
- **Checkout validation**: `OrdersService.checkout` re-checks that every reseller
  cart line's `productBulkDetailsId` still resolves to an active
  (`status = 1`) package; otherwise `BadRequestException`.
- **Order creation**: identical `orders` row shape as consumer — one `orders` row
  per cart line, `product_type = 'reseller'`. There is **no** separate reseller
  order table.
- **Inventory effects**: `NOT FOUND IN CURRENT CODEBASE` — no stock/quantity is
  decremented anywhere for reseller purchases (same gap as consumer).
- **Reseller-specific restrictions**: only the min/max package-count bound above.
  There is no user-type/role gate — any authenticated user can add a reseller cart
  item (`grep` across `cart`/`orders`/`product-bulk-details` for `userType`/
  `user_type` returns nothing). See Known Gap #2.
- **Reseller-specific points/rewards**: reseller purchases use the **same**
  `BUY_PRODUCT` point-distribution pipeline as consumer (see §6). Notably, the
  crediting worker (`PointDistributionQueueService.processPurchase`) computes
  points from `product.totalPoints` (the flat product-level column), **not**
  from `product_bulk_details.totalPoints` (the per-package points value shown to
  buyers via `showTotalPoints`/`showPointsSharing` on the package). See Known
  Gap #3 — this is a real discrepancy between what the buyer is shown and what
  is actually credited.

---

## 5. Partner Logic

Code: `CartService` (partner-exclusivity check),
`OrdersService.finalizeOrdersAsPaid` (points skip).

Implemented behavior, in full:
1. `cart_type = 'partner'` add is blocked if the buyer already has a
   `consumer` or `reseller` row for the same product (`CartService.addToCart`).
2. Quantity bounded by `partner_minimum_quantity`/`partner_maximum_quantity`
   (checked at add-to-cart and again at checkout, same two-layer pattern as
   consumer).
3. Pricing goes through the same `CheckoutPricingService` as consumer (product's
   `sellingPrice` net of its own discount), scoped by `ProductType.PARTNER` for
   extra charges/add-ons/discounts/coupons lookups.
4. **Point distribution is skipped** for the order — but the actual condition
   checked is `order.product?.partnerAvailable === 1` (a flag on the *product
   row*), not `order.productType === CartType.PARTNER` (the *cart type actually
   used for this order*). See Known Gap #1 for the resulting inconsistency.

Nothing else is implemented for partner: no external-platform table, no
commission/revenue split, no distinct partner order status, no distinct
partner-only API surface beyond the shared product/cart/order endpoints filtered
by `type=partner`.

---

## 6. Points & Reward Logic

Code: `src/point-distribution/services/point-distribution-queue.service.ts`
(the actual crediting engine), `src/point-distribution/processors/point-distribution-queue.processor.ts`
(Bull consumer), `src/orders/orders.service.ts` (`finalizeOrdersAsPaid`, the
producer).

### 6.1 Trigger

When an order transitions to PAID/CONFIRMED — either via
`OrdersService.markPaidBySessionId` (Stripe/CoinPayments webhook or the 30-second
reconciliation cron) or the "wallet covered the whole order" path in
`checkout()` — `finalizeOrdersAsPaid` runs for every order in that batch:
1. Clears the buyer's cart rows for that product.
2. Fires a best-effort "order confirmed" notification.
3. **Skips point-distribution queuing entirely if `order.product.partnerAvailable
   === 1`.**
4. Otherwise creates a `point_distribution_purchase_queue` row (`totalPoints`/
   `remainingPoints` start at `'0'`, filled in by the worker) and enqueues a Bull
   job `purchase-distribution` on the `point-distribution` queue
   (`attempts: 5`, `removeOnComplete: 1000`, `removeOnFail: false`).

### 6.2 Distribution rules

Admin-configured rows in `point_distributions`
(`src/shared/entities/point-distribution.entity.ts`), each with:
- `event_type` (only `BUY_PRODUCT` is read by the worker; other enum values —
  `SELL_PRODUCT`, `REFERRAL`, `POOL_DISTRIBUTION`, `ADMIN_ADJUSTMENT`, `BONUS`,
  `REFUND`, `OTHER` — exist in the enum but are **`REFERENCED / NOT FULLY
  IMPLEMENTED`**, nothing in the codebase reads/writes them).
- `receiver_type`: `BUYER`, `MERCHANT`, `UPLINE_LEVEL_1`, `UPLINE_LEVEL_2`,
  `POOL`, `ADMIN`. Only `BUYER`, `UPLINE_LEVEL_1`, `UPLINE_LEVEL_2`, and `POOL`
  are actually consumed by the worker; `MERCHANT` and a receiver-agnostic
  `ADMIN` rule row are **not read** (`ADMIN` crediting only happens as an upline
  *fallback*, described below — not from an `ADMIN`-receiver-type rule row).
- `points_percentage`: this rule's share (0–100) of the purchased product's
  `total_points` **per unit**. The legacy `points` (flat) column is no longer
  read by the worker (kept for backward compatibility only).

### 6.3 Calculation (`PointDistributionQueueService.processPurchase`)

```
totalPointsPerUnit = product.totalPoints
buyerPointsPerUnit = totalPointsPerUnit * buyerRule.points_percentage / 100
uplinePointsPerUnit[i] = totalPointsPerUnit * uplineRule[i].points_percentage / 100
poolPointsPerUnit = totalPointsPerUnit * poolRule.points_percentage / 100

totalPoints = quantity * (buyerPointsPerUnit + Σ uplinePointsPerUnit + poolPointsPerUnit)
```
(`calculateSharedPoints`, `src/shared/utils/point-sharing.util.ts` — shared with
the buyer-facing "points sharing" preview in `ProductsService`, so the preview
and the actual credit amount use the same formula for consumer listings — but
see Known Gap #3 for the reseller-package divergence.)

### 6.4 Direct buyer, Level 1, Level 2

- **Direct buyer**: credited `quantity * buyerPointsPerUnit` if an active
  `BUYER` rule exists.
- **Upline levels**: the buyer's referral chain is walked live via
  `users.referral_id` (`User.referral`, self-referencing FK) — one hop per active
  upline rule, sorted so `UPLINE_LEVEL_1` always resolves/credits before
  `UPLINE_LEVEL_2`. Only two levels are modelled (`UPLINE_LEVEL_1`,
  `UPLINE_LEVEL_2` — matching the queue's `stage` enum); there is no
  code path for a third level.
- **No upline at a level** (buyer, or an ancestor, has no `referral`): that
  level's points are credited to a **fallback admin** — the lowest-`id` row in
  `admins` (`getFallbackAdmin`) — via `PointAdminBalance`, instead of being
  dropped. This applies to every level *after* the missing one too, since the
  chain walk stops at the first `null`.
- **Pool**: if a `POOL` rule is active, `quantity * poolPointsPerUnit` is added
  to the most-recently-created `point_pools` row with `status = 'active'`
  (`PointPool.currentBalance`/`totalCredit`). If no active pool exists, the
  credit is skipped (logged, non-fatal — does not fail the purchase).

### 6.5 Eligibility

- Product must have `partnerAvailable !== 1` at time of order finalization (see
  Known Gap #1 — this is checked on the **product**, not the order's cart type).
- Order must reach PAID/CONFIRMED status.
- Otherwise no other eligibility gate (e.g. no minimum order value) was found.

### 6.6 Ledger & balances

Every credit writes both a balance-table mutation and an immutable
`point_transactions` row, inside one DB transaction per stage:
- `PointUserBalance` (`point_user_balances`, one row per `user_id`,
  `totalCredit`/`totalDebit`/`currentBalance`) for buyer and upline credits.
- `PointAdminBalance` (`point_admin_balances`, one row per `admin_id`) for the
  no-upline fallback.
- `PointPool` (`point_pools`) for the pool credit.
- `PointTransaction` (`point_transactions`) records `wallet_type`,
  `transaction_type` (`CREDIT`), `transaction_reason` (`BUY_PRODUCT`),
  `source_user_id` (always the buyer), `receiver_user_id`/`receiver_admin_id`,
  `product_id`, `order_id`, `point_distribution_id`, `pool_id`, `amount`,
  `remarks`.

### 6.7 Queue / worker resiliency

`point_distribution_purchase_queue` (`src/shared/entities/point-distribution-purchase-queue.entity.ts`)
tracks a `stage` enum (`created → buyer_reward → level1_reward → level2_reward →
pool_reward → completed`) and `status` (`pending/processing/completed/failed`).
- **Idempotency**: a job whose entry is already `completed`/stage `completed` is
  a no-op on redelivery.
- **Resumability**: each stage's credit + stage-advance happen in one DB
  transaction, so a crash between "credited" and "stage advanced" is impossible
  — a retried job re-derives the upline chain fresh and skips every stage whose
  index is `<= resumeFromStage`, so it never double-credits.
- **Retries**: Bull job configured with `attempts: 5`; on failure the queue row's
  `status` becomes `failed`, `retryCount` increments, `error` is recorded, and
  the exception is rethrown so Bull's own retry/backoff fires.
- **Rollback/reversal on order cancellation/refund**: `NOT FOUND IN CURRENT
  CODEBASE` — no code path reverses a `point_transactions`/balance credit when
  an order is later cancelled or refunded (see §20 Known Gaps).

---

## 7. Referral / Upline Logic

Code: `src/shared/entities/user.entity.ts` (`referral`/`referredUsers`),
`src/users/users.service.ts` (registration + "my team").

- **Structure**: single self-referencing FK, `users.referral_id → users.id`
  (`onDelete: 'SET NULL'`). This is a **flat single-parent tree** — there is no
  separate `referrals`/`upline` table; the whole referral graph lives in one
  column on `users`.
- **Assignment**: set once, at registration time, from `referral_username` in the
  signup DTO (`UsersService.create`/`registerWithUsername` — the referral is
  looked up by `username`, not `unique_user_id`, and must already exist or
  registration fails with `BadRequestException`). There is no code path to
  change a user's referral after registration.
- **"My team"** (`UsersService.getMyTeam`, `GET` via `profile.controller.ts`):
  one endpoint, `level` param picks level 1 (direct `referral_id = me`) or level
  2 (`referral_id IN (my level-1 users' ids)`). For each teammate it also
  surfaces their paid-order count and the caller's own points earned off that
  teammate's purchases (queried from `point_transactions` where
  `receiver_user_id = me AND source_user_id = teammate`).
- **Depth**: strictly two levels — matches the two `UPLINE_LEVEL_1`/
  `UPLINE_LEVEL_2` point-distribution stages; the code has no concept of level 3+.

---

## 8. Mall & Points Redemption

Code: [`src/reward-mall-products/`](src/reward-mall-products),
[`src/reward-mall-purchases/reward-mall-purchases.service.ts`](src/reward-mall-purchases/reward-mall-purchases.service.ts),
[`src/reward-mall-categories/`](src/reward-mall-categories),
[`src/reward-mall-purchase-status/`](src/reward-mall-purchase-status).

### 8.1 Tables

- `reward_mall_products` — the redeemable catalog. Key columns: `category_id`,
  `point_price` (cost per unit, in points), `minimum_quantity`/
  `maximum_quantity`, `stock`/`stock_show`/`is_out_of_stock`, `status`.
- `reward_mall_categories` — category grouping for mall products.
- `reward_mall_product_media` — images/media per mall product.
- `reward_mall_purchase` — one row per redemption: `user_id`,
  `reward_mall_product_id`, `quantity`, `points_redeemed` (snapshot of
  `pointPrice * quantity` at redemption time), `status_id`, `tracking_number`,
  `admin_remark`/`user_remark` (JSON arrays), `delivered_at`.
- `reward_mall_purchase_status` — admin-managed status vocabulary (id 1 is
  treated as the default "pending" state by convention, matching the
  `order_status`/`payment_status` pattern — no seed migration for it was found).

### 8.2 Flow (`RewardMallPurchasesService.purchase`)

`User Points → Mall Product → Point Validation → Point Deduction → Redemption Order`,
all inside one DB transaction:
1. Product must exist and be `status = 1`; rejected if `isOutOfStock`.
2. Quantity defaults to the product's `minimumQuantity`; validated against
   `[minimumQuantity, maximumQuantity]`.
3. **`maximumQuantity` is enforced as a per-user *lifetime* cap**, not just a
   per-request bound: the sum of every prior purchase row this user has for this
   product (regardless of that purchase's later fulfilment status) plus the new
   quantity must not exceed `maximumQuantity`.
4. The user's `point_user_balances` row is locked (`pessimistic_write`) for the
   duration of the transaction — this both prevents a double-spend race on
   affordability and serializes the per-user quantity cap check above.
5. `pointsRequired = product.pointPrice * quantity`; rejected with
   `BadRequestException` if `currentBalance < pointsRequired`.
6. On success: `PointUserBalance.totalDebit`/`currentBalance` updated, a
   `PointTransaction` (`walletType: USER`, `transactionType: DEBIT`,
   `transactionReason: OTHER` — **no dedicated enum value exists for mall
   redemptions**, see Known Gap #5) is written, and a `reward_mall_purchase` row
   is created with `statusId = 1`.
7. **Stock is never decremented** — `reward_mall_products.stock` exists but no
   redemption path writes to it (only the boolean `isOutOfStock` flag is
   checked, and that flag must be toggled by an admin manually). See Known Gap
   #4.
8. **Points are debited irreversibly at redemption time** — the code comment on
   `update()` states this explicitly. There is no cancellation/refund path that
   restores points to the user if an admin later marks a redemption as rejected/
   cancelled.

### 8.3 Admin fulfilment (`RewardMallPurchasesService.update`)

Admin can append to `adminRemark`, change `statusId`, set `trackingNumber`, set
`deliveredAt`. This never touches points — purely fulfilment bookkeeping.

### 8.4 Wallet interaction

The `vimas_e_wallet` store-credit balance (`users.vimas_e_wallet_balance`) is
explicitly documented (comment in `user.entity.ts`) as usable **only** toward
normal product checkout, never toward `reward_mall_products` — confirmed by
`RewardMallPurchasesService` never referencing `VimasEWalletService`.

---

## 9. Cart Logic

Code: [`src/cart/cart.service.ts`](src/cart/cart.service.ts),
[`src/shared/entities/cart.entity.ts`](src/shared/entities/cart.entity.ts).

- Table: `cart`. Columns: `buyer_id`, `product_id`, `quantity`, `cart_type`
  (`consumer`/`reseller`/`partner`, default `consumer`), `product_bulk_details_id`
  (nullable, reseller-only), `price_snapshot`, `discount_snapshot`.
- **Row identity**: a buyer can hold one consumer row **and**, independently, one
  reseller row per distinct bulk package for the same product, at the same time.
  Enforced via a DB-level generated column
  (`product_bulk_details_key = COALESCE(product_bulk_details_id, 0)`, added by
  raw SQL — not present in the TypeORM entity's `@Unique` decorator, which is
  documentation-only since `synchronize` is off).
- **Add** (`addToCart`): resolves quantity bounds per `cart_type` (see §3/§4/§5),
  validates a reseller package if applicable, sums the buyer's existing rows for
  that product+type, and rejects if the new total falls outside
  `[min, max]`. Partner is blocked if a consumer/reseller row already exists for
  the same product (and vice versa is *not* blocked — only partner is exclusive).
- **Update** (`updateCartItem`): same bound re-check, targeting one specific row
  (disambiguated by `productBulkDetailsId` for reseller).
- **Remove** (`removeFromCart`): reseller removal requires
  `productBulkDetailsId` to identify which package's row to delete (otherwise it
  would ambiguously match multiple rows).
- **Get** (`getCart`): returns all of the buyer's rows with `productBulkDetails`
  relation eager-loaded.
- Admin cart controller (`src/cart/admin/cart.controller.ts`) exists but is
  **not** guarded by `RolesGuard`/`@Roles('admin')` — see Known Gap #6.

---

## 10. Checkout Logic

Code: [`src/orders/orders.service.ts`](src/orders/orders.service.ts) (`checkout`),
[`src/orders/checkout-pricing.service.ts`](src/orders/checkout-pricing.service.ts).

`OrdersService.checkout(buyerId, dto)`:
1. Loads the buyer's entire cart (all types) — the cart is checked out
   atomically, in full; there is no partial/selective checkout.
2. Validates `contactInfoId` belongs to the buyer (`contact_info` table).
3. Resolves `paymentOptionId` (default `1`) → `payment_options` row → flat
   `charges` fee (added as its own separate line item on the gateway checkout
   session, kept **out of** `orders.totalAmount`/`totalAmountPaid` since it isn't
   tied to a product).
4. Re-validates every cart line's quantity bounds against the *live* product/
   bulk-package state (§3/§4).
5. Calls `CheckoutPricingService.calculate` (see §14) — this is the single
   source of truth for pricing; nothing about amounts is trusted from the
   client except *selections* (`couponCodes`, `addOnIds`, `useWallet`).
6. **Inside one DB transaction**: creates one `order_snapshots` row (opaque
   `snapshot_data` JSON + `total_amount` + `currency: 'MYR'`), then one `orders`
   row per cart line (all pointing at that snapshot via `order_snapshot_id`),
   then — if wallet was used — debits the wallet via
   `VimasEWalletService.debitForCheckout` using the *same* transaction manager.
7. **If wallet fully covers the total**: orders are marked PAID/CONFIRMED
   immediately (no gateway involved) and `finalizeOrdersAsPaid` runs inline.
8. **Otherwise**: routes to Stripe or CoinPayments based on whether the selected
   `payment_options.name` contains `coinpayment`/`coin payment`/`crypto`
   (case-insensitive substring match, `COINPAYMENTS_NAME_KEYWORDS`).
9. **Failure compensation**: if session creation with the gateway fails, the
   just-created `orders` rows are deleted; if the whole `checkout()` catch block
   is reached (any error after the transaction committed), any wallet debit is
   reversed via `refundForCheckout` and the orphaned `order_snapshots` row is
   deleted — so nothing is left half-applied.
10. `GET /orders/checkout/pricing` (`previewCheckoutPricing`) runs the identical
    pricing calculation read-only, for a live checkout-page preview.

---

## 11. Order Logic

Code: `orders` + `order_snapshots` tables, `OrdersService`.

- `orders` — one row **per cart line** (i.e., per product per cart_type), not one
  row per checkout session. Key columns: `order_snapshot_id`, `product_type`
  (`CartType` enum), `buyer_id`, `product_id`, `buyer_contact_details_id`,
  `payment_option_id`, `payment_status_id` (default 1), `order_status_id`
  (default 1), `payment_gateway_id` (Stripe session id or CoinPayments invoice
  id — same column serves both gateways), `quantity`, `single_unit_price`,
  `total_amount` (pure product subtotal), `total_amount_paid` (subtotal + that
  item's extra charges/add-ons − discounts − coupon − its share of any wallet
  applied).
- `order_snapshots` — one row **per checkout session** (shared by every order
  from that checkout). Holds the full pricing breakdown as opaque JSON
  (`snapshot_data`) plus `total_amount`/`currency`. This table *replaced*
  per-order `discount_amount`/`addon_amount`/`coupon_amount` columns (per a code
  comment on the entity), so historical/legacy breakdown columns on `orders`
  itself do not exist.
- **No merchant_id** on `orders` — admin is the sole product owner, so there is
  no second party to attribute besides buyer + product (explicit code comment).
- Status admin update (`OrdersController` admin, `updateStatus`): admin can set
  `orderStatusId`/`paymentStatusId` directly; a status-change notification fires
  if `orderStatusId` changed. **No side effects** (no point reversal, no wallet
  refund, no stock restoration) are triggered by this manual update.
- Buyer-facing reads: `findMyOrders` (paginated, searchable by product name /
  gateway id), `findMyOrder`, `getMyOrderSnapshot` (buyer-scoped — 404s if the
  snapshot doesn't belong to one of the buyer's own orders).
- Admin reads: `findAll`, `findOne`, `getOrderSnapshot` (unrestricted).

---

## 12. Payment Logic

Code: `OrdersService` (Stripe/CoinPayments branches + webhooks + cron
reconciliation), `src/stripe/`, `src/coinpayments/`.

- **Gateway selection**: substring match on the chosen `payment_options.name`
  (see §10 step 8). Anything not matching CoinPayments keywords goes to Stripe.
- **Stripe path** (`createStripeCheckout`): one Stripe line item per order (unit
  price derived from `totalAmountPaid / quantity`, not a stored discount
  column), plus a flat "Payment processing fee" line if the payment option has
  `charges > 0`. `orders.payment_gateway_id` is set to the Stripe session id.
- **CoinPayments path** (`createCoinPaymentsCheckout`): requires
  `dto.cryptoCurrencyId`; converts MYR → USDT → selected coin via a two-leg rate
  (`FIAT_TO_USDT_RATE` env var, default `0.25`, then `CoinPaymentsService.getRate`);
  creates an invoice; `orders.payment_gateway_id` is set to the CoinPayments
  invoice id — deliberately the same column as the Stripe session id, so
  downstream reconciliation code is gateway-agnostic.
- **Confirmation paths** (three, all converging on `markPaidBySessionId`):
  1. Stripe webhook (`handleStripeWebhook` — `checkout.session.completed`,
     `checkout.session.expired`, `payment_intent.payment_failed`).
  2. CoinPayments webhook (`handleCoinPaymentsWebhook` — HMAC-SHA256-verified).
  3. **Cron fallback**, every 30 seconds (`@Cron(CronExpression.EVERY_30_SECONDS)`),
     two separate jobs: `reconcilePendingOrdersWithStripe` and
     `reconcilePendingOrdersWithCoinPayments`, each guarded by an in-memory
     re-entrancy flag so a slow gateway round-trip can't overlap with the next
     tick. These re-poll every still-PENDING order's gateway session directly —
     a safety net for missed webhooks.
- **Idempotency**: `markPaidBySessionId` snapshots exactly which orders are
  still PENDING for that session *before* updating them; a redelivered webhook
  finds zero pending orders on its second pass and does nothing — this is what
  prevents duplicate point-distribution queue rows / double-crediting.
- **Failed payment**: `payment_intent.payment_failed` (Stripe) and
  cancelled/timed-out (CoinPayments) both set `payment_status_id = 3` (Failed)
  and `order_status_id = 5`. **Note**: `order_status_id = 5` is seeded as name
  `"Cancelled"`, not `"Failed"` (see `SeedOrderAndPaymentStatus` migration) — the
  code constant is named `FAILED_ORDER_STATUS_ID` but points at the "Cancelled"
  status row. This is a naming/data mismatch, not a functional bug, but worth
  knowing when reading order-status values in the DB (see Known Gap #7).
- **Refund**: `payment_status` seed data includes id 4 = `"Refunded"`, but
  **no code path ever sets it** — `NOT FOUND IN CURRENT CODEBASE` (see §20).

---

## 13. Coupon Logic

Code: `product_coupons` table
([`src/shared/entities/product-coupon.entity.ts`](src/shared/entities/product-coupon.entity.ts)),
[`src/product-coupons/product-coupons.service.ts`](src/product-coupons/product-coupons.service.ts),
consumed by `CheckoutPricingService`.

- Admin-configured, scoped to one `product_id` + `product_type` (`CONSUMER`/
  `RESELLER`/`PARTNER` — the uppercase `ProductType` enum, mapped 1:1 from the
  lowercase `CartType` via `toProductType()`), identified by a unique-per-row
  `code` (opt-in — buyer must type it in), `discount_type` (`PERCENTAGE`/
  `AMOUNT`), `percentage`/`amount`, optional `minimum_quantity`,
  `maximum_discount_amount` (percentage cap), `usage_limit`, `start_at`/`end_at`
  validity window, `is_active`.
- **Matching** (`CheckoutPricingService`, §14): one code per checkout request is
  matched to its own cart line by `productId` + matching `productType` +
  validity window + `minimumQuantity`. Two codes are never allowed to resolve to
  the same product in one checkout (rejected). A candidate coupon whose product
  isn't in the cart, or whose type doesn't match the cart line's type, is
  skipped in favor of the next candidate with the same code (code uniqueness is
  not DB-enforced across products).
- **Usage-limit enforcement**: **approximate** — there is no dedicated usage
  counter column. `countCouponUsage` scans committed `order_snapshots.snapshot_data`
  JSON for the code via `JSON_SEARCH`, unindexed. The code comment explicitly
  flags this as "acceptable at expected coupon-usage volume, flagged as a known
  limitation" (see Known Gap #8).
- **Calculation**: `raw = subtotal * pct/100` or flat `amount`; capped by
  `maximumDiscountAmount` if percentage; further capped so it can't exceed
  `subtotal - discountsTotal` (i.e., an automatic discount is applied first, the
  coupon then discounts what's left, never producing a negative payable).
- Automatic discounts (`product_discounts`, §14) and coupons are independent and
  can **both** apply to the same line; only one automatic discount can apply per
  line ("best one wins — no stacking column", per code comment), but a coupon is
  a separate discount layer.

---

## 14. Inventory / Quantity Logic

- **Quantity bounds**: fully covered in §3/§4/§5/§9/§10 — two-layer enforcement
  (add-to-cart + checkout), per `cart_type`, sourced from
  `products.{consumer,reseller,partner}_{minimum,maximum}_quantity` or, for
  reseller, from the selected `product_bulk_details` package's active status.
- **Stock/inventory decrement on purchase**: `NOT FOUND IN CURRENT CODEBASE`.
  Both `products.stock` and `reward_mall_products.stock` exist as columns (with
  `stock_show`/`is_out_of_stock` display/gating flags), but no service in
  `orders/`, `cart/`, or `reward-mall-purchases/` ever decrements them. Only the
  boolean `is_out_of_stock` flag gates purchasability, and it must be toggled by
  an admin manually (see Known Gap #4).
- **Reward Mall per-user lifetime cap**: `maximumQuantity` on
  `reward_mall_products` is enforced as a *lifetime* cap per user (§8.2), unlike
  the `products` table's per-cart-type bounds which are simply "current cart
  total," not lifetime.

---

## 15. Database Tables

Only tables that are actually referenced by application code are listed. Column
names below are the DB column names (`name:` in the `@Column` decorator, or the
property name where no override exists).

### `users`
Purpose: the platform's single user/account table (buyers, resellers, referrers —
all the same entity; no separate `resellers`/`partners` table).
Key columns: `id`, `unique_user_id`, `username`, `email`, `password`,
`referral_id` (self-FK), `user_type_id`, `registration_type_id`,
`membership_type_id`, `status`, `vimas_e_wallet_balance`, `vimas_e_wallet_status`.
Relationships: `referral_id → users.id` (self); `user_type_id → user_types.id`;
`registration_type_id → registration_types.id`; `membership_type_id →
membership_types.id`.
Used by: `users`, `orders`, `cart`, `point-distribution`, `point-user-balance`,
`vimas-e-wallet`, `reward-mall-purchases`, `notifications`.
Business logic: the referral graph (§7) and points system's whole receiver-side
model hinge on `referral_id`.

### `products`
Purpose: unified catalog for consumer, reseller, and partner sales (§2).
Key columns: `selling_price`, `discount_available`/`discount_amount`/
`discount_percentage`, `total_points`, `consumer_minimum_quantity`/
`consumer_maximum_quantity`, `reseller_minimum_quantity`/`reseller_maximum_quantity`,
`partner_minimum_quantity`/`partner_maximum_quantity`, `show_total_points`,
`show_points_sharing`, `stock_show`/`stock`/`is_out_of_stock`, `bulk_available`,
`consumer_available`, `partner_available`, `category_id`, `brand_id`, `status`.
Relationships: `category_id → categories.id`; `brand_id → brand.id`; one-to-many
to `product_bulk_details`, `product_media`, `product_action`,
`product_payment_options`, `cart`, `orders`, `review_rating`, `product_history`,
`point_distribution_purchase_queue`, `product_extra_charges`, `product_add_ons`,
`product_coupons`, `product_discounts`.
Used by: `products`, `cart`, `orders`, `checkout-pricing`, `point-distribution`.
Business logic: the three `*_available` flags gate which listing endpoint
(`?type=consumer|reseller|partner`) returns the row; the three min/max pairs are
the enforced purchase-quantity bounds per channel (§3/§4/§5).

### `product_bulk_details`
Purpose: reseller "packages" for a product (§4) — the closest thing this codebase
has to a "reseller package" table.
Key columns: `product_id`, `package_quantity`, `unit_price`,
`discount_percentage`, `free_quantity`, `fees`, `total_price`, `total_points`,
`show_total_points`, `show_points_sharing`, `sort_order`, `status`.
Primary key: `id` (bigint).
Foreign keys: `product_id → products.id` (`onDelete: 'CASCADE'`).
Unique: `(product_id, package_quantity)`.
Used by: `product-bulk-details`, `cart`, `checkout-pricing`.
Business logic: `total_price` is the reseller line's unit price at checkout;
`total_points` is shown to the buyer but is **not** what the points worker
actually uses (Known Gap #3).

### `cart`
Purpose: the shopping cart, shared by all three purchase channels.
Key columns: `buyer_id`, `product_id`, `quantity`, `cart_type`
(`consumer`/`reseller`/`partner`), `product_bulk_details_id` (reseller only,
nullable), `price_snapshot`, `discount_snapshot`.
Foreign keys: `buyer_id → users.id`; `product_id → products.id`;
`product_bulk_details_id → product_bulk_details.id` (`onDelete: 'SET NULL'`).
Identity: DB-level generated-column unique index on
`(buyer_id, product_id, cart_type, COALESCE(product_bulk_details_id, 0))`.
Used by: `cart`, `orders` (read at checkout, deleted at fulfilment).
Business logic: quantity here is *pre-checkout intent*; bounds re-validated at
checkout (§9/§10).

### `orders`
Purpose: order line — one row per cart line checked out (§11).
Key columns: `order_snapshot_id`, `product_type` (`CartType`), `buyer_id`,
`product_id`, `buyer_contact_details_id`, `payment_option_id`,
`payment_status_id`, `order_status_id`, `payment_gateway_id`, `quantity`,
`single_unit_price`, `total_amount`, `total_amount_paid`.
Foreign keys: `order_snapshot_id → order_snapshots.id`; `buyer_id → users.id`;
`product_id → products.id`; `buyer_contact_details_id → contact_info.id`;
`payment_option_id → payment_options.id`; `payment_status_id → payment_status.id`;
`order_status_id → order_status.id`.
Used by: `orders`, `point-distribution` (via `point_distribution_purchase_queue.order_id`),
`point-transaction` (reference only, no DB FK).
Business logic: `payment_gateway_id` is a dual-purpose column (Stripe session id
or CoinPayments invoice id).

### `order_snapshots`
Purpose: point-in-time pricing breakdown for a whole checkout session (§11).
Key columns: `total_amount`, `currency`, `snapshot_data` (JSON).
Primary key: `id` (bigint).
Relationships: one-to-many to `orders`.
Used by: `orders`, `checkout-pricing` (also scanned by `countCouponUsage` for
coupon-usage approximation).
Business logic: replaces what would otherwise be per-order discount/addon/coupon
columns; the JSON shape is produced entirely by `CheckoutPricingService.calculate`.

### `contact_info`
Purpose: buyer shipping/contact address book, one row selected per checkout.
Key columns: `user_id`, `phone_number`, `country_code`, `address_1`, `address_2`,
`landmark`, `state`, `country`.
Foreign keys: `user_id → users.id` (`onDelete: 'CASCADE'`).
Unique: `(country_code, phone_number)`.
Used by: `contact-info`, `orders`.

### `payment_options`
Purpose: admin-configured payment methods (Stripe generic, CoinPayments/crypto,
etc.), each with a flat `charges` fee.
Key columns: `name`, `charges`, `status`.
Used by: `payment-option`, `orders` (gateway routing by name substring, §12),
`product_payment_options`.

### `product_payment_options`
Purpose: which payment options are enabled per product.
Key columns: `product_id`, `payment_option_id`.
Foreign keys: `product_id → products.id`; `payment_option_id → payment_options.id`
(`onDelete: 'CASCADE'`). Unique: `(product, paymentOption)`.
Used by: `product-payment-option`, surfaced on the buyer product-detail response.

### `crypto_currencies`
Purpose: which crypto coins CoinPayments checkout can settle in.
Used by: `crypto-currencies`, `orders` (CoinPayments checkout branch).

### `order_status` / `payment_status`
Purpose: admin-managed status vocabularies referenced by `orders`.
Seed data (`SeedOrderAndPaymentStatus` migration): `payment_status` 1=Pending,
2=Paid, 3=Failed, 4=Refunded. `order_status` 1=Pending, 2=Confirmed, 3=Shipped,
4=Delivered, 5=Cancelled.
Business logic: `OrdersService` constants `PENDING_PAYMENT_STATUS_ID=1`,
`PAID_PAYMENT_STATUS_ID=2`, `FAILED_PAYMENT_STATUS_ID=3`,
`CONFIRMED_ORDER_STATUS_ID=2`, `FAILED_ORDER_STATUS_ID=5` — note the last one
points at the seeded "Cancelled" name (§12, Known Gap #7). `payment_status` id 4
("Refunded") is never set by any code path (Known Gap #7).

### `product_extra_charges`, `product_add_ons`, `product_discounts`, `product_coupons`
Purpose: admin-configured, per-product, per-`product_type`-scoped pricing rule
tables consumed exclusively by `CheckoutPricingService` (§13/§14). See §13 for
`product_coupons`; the other three follow the same product_id + product_type
scoping pattern:
- `product_extra_charges`: mandatory charges (e.g. processing fee), percentage or
  fixed, per-quantity or per-product basis, optional `waive_at_quantity`.
- `product_add_ons`: opt-in extras (buyer must request by id at checkout),
  percentage or fixed, optional `cost_per_unit` (per-unit vs flat) and
  `applicable_minimum_quantity`.
- `product_discounts`: automatic (no buyer input) — best-one-wins, no stacking.
All four: `onDelete: 'CASCADE'` from `product_id → products.id`.
Used by: `orders/checkout-pricing.service.ts` exclusively for calculation; each
has its own admin CRUD controller under `admin/product-{extra-charges,add-ons,discounts,coupons}`.

### `point_distributions`
Purpose: admin-configured points-sharing rules (§6.2).
Key columns: `event_type`, `receiver_type`, `points` (legacy, unread),
`points_percentage`, `priority`, `status`.
Used by: `point-distribution`, `PointDistributionQueueService`, `ProductsService`
(buyer-facing points-sharing preview).

### `point_distribution_purchase_queue`
Purpose: the durable work-queue row backing each Bull `purchase-distribution` job
(§6.7).
Key columns: `user_id`, `order_id` (unique), `product_id`, `quantity`,
`total_points`, `remaining_points`, `status`, `stage`, `retry_count`, `error`,
`last_attempt_at`, `processed_at`.
Foreign keys: `user_id → users.id`; `order_id → orders.id` (1:1); `product_id →
products.id`.
Used by: `orders` (producer), `point-distribution` (consumer/worker).

### `point_user_balances`
Purpose: one row per user holding their live points balance.
Key columns: `user_id` (unique), `total_credit`, `total_debit`, `current_balance`.
Used by: `point-distribution` (credits), `reward-mall-purchases` (debits),
`users` (my-team earnings summary).

### `point_admin_balances`
Purpose: one row per admin holding points credited via the no-upline fallback
(§6.4).
Key columns: `admin_id` (unique), `total_credit`, `total_debit`, `current_balance`.

### `point_pools`
Purpose: shared point pool(s) that accumulate the `POOL`-rule share of every
qualifying purchase.
Key columns: `pool_detail_id`, `from_datetime`/`to_datetime`, `total_users`,
`total_admins`, `total_credit`, `total_debit`, `current_balance`,
`distributed_points`, `status` (`active`/`inactive`/`completed`/`cancelled`).
Foreign keys: `pool_detail_id → point_pool_details.id`.
Business logic: `distributed_points` exists but is **never written** — the
crediting code has it commented out (`// pool.distributedPoints = ...`); nothing
in the codebase distributes pool funds back out to users (Known Gap #9).

### `point_pool_details`
Purpose: admin-defined pool "types"/cadences (`hourly`…`yearly`), name/symbol/
colour metadata.

### `point_transactions`
Purpose: the append-only ledger for every points movement in the system (buyer
rewards, upline rewards, admin fallback, pool credit, mall redemption debit,
admin manual adjustment).
Key columns: `wallet_type` (`USER`/`ADMIN`/`POOL`), `wallet_id`,
`transaction_type` (`CREDIT`/`DEBIT`), `transaction_reason` (enum — see §6/§8 for
which values are actually produced), `source_user_id`, `source_admin_id`,
`receiver_user_id`, `receiver_admin_id`, `product_id` (no DB FK), `order_id` (no
DB FK), `point_distribution_id`, `pool_id`, `amount`, `remarks`.
Business logic: this table has no reversal/compensating-entry convention — a
mistaken or to-be-reversed credit needs a new offsetting row written manually;
nothing automates that (see §20).

### `reward_mall_products`, `reward_mall_categories`, `reward_mall_product_media`, `reward_mall_purchase`, `reward_mall_purchase_status`
Covered fully in §8.

### `vimas_e_wallet_transactions`
Purpose: immutable ledger for every `users.vimas_e_wallet_balance` change.
Key columns: `user_id`, `type` (`CREDIT`/`DEBIT`/`CHECKOUT`/`REFUND`), `amount`,
`balance_before`, `balance_after`, `created_by` (`USER`/`ADMIN`/`SYSTEM`),
`description`, `reference_type`/`reference_id` (points at an `order_snapshots.id`
for checkout/refund rows, via the constant `WALLET_ORDER_SNAPSHOT_REFERENCE =
'order_snapshot'`).
Used by: `vimas-e-wallet`, `orders` (checkout debit + failure-path refund).
Business logic: every balance mutation is required (by convention, enforced by
always routing through `VimasEWalletService.mutateBalance`) to produce exactly
one of these rows in the same transaction as the balance change; row-locked
(`pessimistic_write`) to prevent concurrent balance races.

### `admins`
Purpose: separate admin-account table (not `users` with a role flag).
Key columns: `username` (unique), `password`, `refresh_token`.
Used by: `admin` module (login), `point_admin_balances`, `point_transactions`.

### Supporting/reference tables (present, lower business-logic weight)
`user_types`, `membership_types`, `registration_types`, `categories`, `brand`,
`category_brands`, `product_media`, `product_action`, `product_history` (JSON
before/after audit trail on product edits), `product_feedback` +
`product_feedback_like`, `product_like`, `product_view`, `review_rating`,
`notification_categories`, `notification_types`, `notifications`,
`notification_preferences`, `user_sessions`, `user_session_storage`.

---

## 16. Database Relationships

```
users
  └─(referral_id, self-FK)→ users                      [referral / upline graph]
  └─(1:N)→ contact_info
  └─(1:N)→ orders (buyer)
  └─(1:1)→ point_user_balances
  └─(1:N)→ point_distribution_purchase_queue
  └─(1:N)→ vimas_e_wallet_transactions

products
  └─(1:N)→ product_bulk_details                        [reseller "packages"]
  └─(1:N)→ product_extra_charges / product_add_ons / product_discounts / product_coupons
  └─(1:N)→ cart
  └─(1:N)→ orders
  └─(1:N)→ point_distribution_purchase_queue

cart
  buyer_id   → users.id
  product_id → products.id
  product_bulk_details_id → product_bulk_details.id   [nullable, reseller only]

orders  (created from cart at checkout)
  order_snapshot_id       → order_snapshots.id         [pricing breakdown, N:1]
  buyer_id                → users.id
  product_id               → products.id
  buyer_contact_details_id → contact_info.id
  payment_option_id        → payment_options.id
  payment_status_id        → payment_status.id
  order_status_id          → order_status.id

orders ─(1:1)→ point_distribution_purchase_queue ─(worker)→ point_transactions
                                                            ├→ point_user_balances   (buyer, upline)
                                                            ├→ point_admin_balances  (no-upline fallback)
                                                            └→ point_pools           (POOL rule share)

users.referral_id chain
  buyer → referral (Level 1) → referral.referral (Level 2)
  walked live by PointDistributionQueueService on every purchase

users
  └─(1:1)→ point_user_balances ─(spend)→ reward_mall_purchase ─(N:1)→ reward_mall_products
                                                              ─(N:1)→ reward_mall_purchase_status
```

---

## 17. Important APIs

All routes below require `JwtAuthGuard` (`Authorization: Bearer <token>`) unless
noted. Admin-only enforcement is via an *additional* `RolesGuard` +
`@Roles('admin')` pair — where that pair is present it is called out; where it is
absent on a controller under `/admin/...`, that is a documented gap (§20).

| Method | Route | Controller | Purpose | Auth |
|---|---|---|---|---|
| GET | `/products?type=consumer\|reseller\|partner` | `ProductsUserController` | Channel-filtered product listing, with points-sharing preview | JWT |
| GET | `/products/:id?type=...` | `ProductsUserController` | Product detail; records a view | JWT |
| POST | `/admin/products` | `ProductsAdminController` | Create product (sets all 3 channels' min/max, `total_points`, availability flags) | JWT + admin |
| PATCH | `/admin/products/:id` | `ProductsAdminController` | **Update product incl. quantity bounds/price/points** | JWT only — **not role-restricted** (Known Gap #6) |
| GET/POST/PATCH/DELETE | `/admin/product-bulk-details` | `ProductBulkDetailsController` (admin) | Reseller package CRUD | JWT + admin |
| GET | `/product-bulk-details/product/:productId` | `ProductBulkDetailsController` (user) | Buyer package picker for a product | JWT |
| POST | `/cart` | `CartController` | Add to cart (`cart_type`, `productBulkDetailsId` for reseller) | JWT |
| PUT | `/cart/:productId` | `CartController` | Update cart line quantity | JWT |
| DELETE | `/cart/:productId?cart_type=&productBulkDetailsId=` | `CartController` | Remove cart line | JWT |
| GET | `/cart` | `CartController` | Get full cart | JWT |
| GET | `/orders/checkout/pricing` | `OrdersController` | Live pricing preview (extra charges/add-ons/discounts/coupon/wallet) — no write | JWT |
| POST | `/orders/checkout` | `OrdersController` | Checkout entire cart → orders + snapshot + gateway session | JWT |
| GET | `/orders/status?sessionId=` | `OrdersController` | Poll order/payment status by gateway session id | JWT |
| GET | `/orders/my`, `/orders/my/:id` | `OrdersController` | Buyer order history/detail | JWT |
| GET | `/orders/snapshots/:id` | `OrdersController` | Buyer-scoped pricing breakdown | JWT |
| PATCH | `/admin/orders/:id/status` (see `orders.controller.ts` admin) | `OrdersController` (admin) | Manual order/payment status override — no automated side effects | JWT + admin |
| POST | `/orders/webhook/stripe`, `/orders/webhook/coinpayments` | `OrdersWebhookController` | Gateway payment confirmation | Public (signature-verified) |
| GET/POST/PATCH/DELETE | `/admin/product-coupons` | `ProductCouponsController` (admin) | Coupon CRUD | JWT + admin |
| GET/POST/PATCH/DELETE | `/admin/product-discounts` | `ProductDiscountsController` (admin) | Automatic discount CRUD | JWT + admin |
| GET/POST/PATCH/DELETE | `/admin/product-extra-charges` | (admin) | Extra-charge CRUD | JWT + admin |
| GET/POST/PATCH/DELETE | `/admin/product-add-ons` | (admin) | Add-on CRUD | JWT + admin |
| GET/POST/PATCH/DELETE | `/admin/point-distribution` | `PointDistributionController` (admin) | Points-sharing rule CRUD (event_type/receiver_type/points_percentage) | JWT + admin |
| GET | `/point-user-balance/my` (`point-user-balance` user controller) | User's own points balance | JWT |
| GET | `/point-transaction/my` (`point-transaction` user controller) | User's own points ledger | JWT |
| GET/POST/PATCH/DELETE | `/admin/point-pool`, `/admin/point-pool-detail` | (admin) | Pool / pool-cadence CRUD | JWT + admin |
| GET | `/users/my-team?level=1\|2` | `ProfileController` | Referral team + per-teammate points earned | JWT |
| POST | `/reward-mall-purchases` (user controller) | `RewardMallPurchasesController` (user) | Redeem points for a mall product | JWT |
| GET | `/reward-mall-purchases/my` / `/my/:id` | (user) | Buyer's redemption history | JWT |
| GET/POST/PATCH/DELETE | `/admin/reward-mall-products` | (admin) | Mall catalog CRUD | JWT + admin |
| PATCH | `/admin/reward-mall-purchases/:id` | (admin) | Fulfilment update (status/tracking/remarks) — never touches points | JWT + admin |
| GET | `/wallet/balance`, `/wallet/transactions` | `WalletController` (user) | Store-credit balance/ledger | JWT |
| POST | `/admin/wallet/credit`, `/admin/wallet/debit` | `WalletAdminController` | Manual store-credit adjustment | JWT + admin (verify per-route) |

---

## 18. Important Modules & Services

- **`ProductsService`** (`src/products/products.service.ts`) — product CRUD,
  channel-filtered listing/detail, buyer-facing points-sharing preview
  (`buildPointsInfo`, `loadBulkPointsSharingByProduct`), product-edit audit
  trail via `ProductHistoryService`.
- **`CartService`** (`src/cart/cart.service.ts`) — add/update/remove/get, all
  quantity-bound and reseller-package validation (§9).
- **`OrdersService`** (`src/orders/orders.service.ts`, 1100+ lines) — checkout
  orchestration, both payment gateways, webhook handling, 30-second cron
  reconciliation (both gateways), post-payment finalization (cart clear,
  notification, points-queue enqueue), admin order management. Calls
  `CheckoutPricingService`, `VimasEWalletService`, `StripeService`,
  `CoinPaymentsService`, `NotificationsService`.
- **`CheckoutPricingService`** (`src/orders/checkout-pricing.service.ts`) — the
  single pricing engine: per-line unit price (product vs bulk package), extra
  charges, opt-in add-ons, best-of automatic discounts, one-coupon-per-product,
  proportional wallet allocation across lines, and the `order_snapshots.snapshot_data`
  shape. Calls `ProductExtraChargesService`, `ProductAddOnsService`,
  `ProductCouponsService`, `ProductDiscountsService`.
- **`PointDistributionQueueService`** (`src/point-distribution/services/point-distribution-queue.service.ts`)
  — the actual points-crediting engine (§6). Stage-resumable, transactional per
  stage, walks the referral chain live, falls back to admin when no upline.
- **`PointDistributionQueueProcessor`** (`src/point-distribution/processors/point-distribution-queue.processor.ts`)
  — thin Bull `@Processor('point-distribution')` wrapper calling the service
  above for the `purchase-distribution` job.
- **`RewardMallPurchasesService`** (`src/reward-mall-purchases/reward-mall-purchases.service.ts`)
  — redemption transaction (§8), admin fulfilment updates.
- **`VimasEWalletService`** (`src/vimas-e-wallet/vimas-e-wallet.service.ts`) —
  store-credit balance mutations, always paired with a
  `vimas_e_wallet_transactions` ledger row, row-locked for concurrency safety.
- **`ProductBulkDetailsService`** (`src/product-bulk-details/product-bulk-details.service.ts`)
  — reseller package CRUD + buyer package picker (§4).
- **`UsersService`** (`src/users/users.service.ts`) — registration (incl.
  referral assignment by username), auth/session issuance, "my team" (§7).
- **`StripeService`** / **`CoinPaymentsService`** — thin gateway API wrappers
  (session/invoice creation, webhook signature verification, rate lookups).

---

## 19. Queues / Workers / Cron Jobs

**Queue infrastructure**: `@nestjs/bull` + `ioredis`, configured globally in
`app.module.ts` (`BullModule.forRoot` reading `REDIS_HOST`/`REDIS_PORT`/
`REDIS_PASSWORD`).

| Queue | Job name | Producer | Consumer | Trigger | Payload | DB effect |
|---|---|---|---|---|---|---|
| `point-distribution` | `purchase-distribution` | `OrdersService.finalizeOrdersAsPaid` | `PointDistributionQueueProcessor` → `PointDistributionQueueService.processPurchase` | An order reaches PAID/CONFIRMED and its product is not `partnerAvailable` | `{ queueId }` (the `point_distribution_purchase_queue.id`) | Writes `point_user_balances`/`point_admin_balances`/`point_pools`/`point_transactions`, advances `point_distribution_purchase_queue.stage/status` | 5 attempts, `removeOnComplete: 1000`, `removeOnFail: false` |

**Cron jobs** (`@nestjs/schedule`, `ScheduleModule.forRoot()` in `app.module.ts`):

| Job | Schedule | Purpose |
|---|---|---|
| `OrdersService.reconcilePendingOrdersWithStripe` | every 30s | Fallback for missed Stripe webhooks — re-polls every PENDING order's Stripe session directly |
| `OrdersService.reconcilePendingOrdersWithCoinPayments` | every 30s | Same, for CoinPayments invoices |

Both cron jobs use an in-memory boolean re-entrancy guard
(`isReconcilingPendingOrders`/`isReconcilingCoinPaymentsOrders`) so a slow
gateway round-trip can't overlap with the next tick — this guard is per-process
memory, not distributed, so it does not protect against overlap across multiple
app instances (`PARTIALLY IMPLEMENTED` if the app is ever horizontally scaled;
`NOT FOUND IN CURRENT CODEBASE` for a distributed lock).

No other cron jobs, scheduled tasks, or event-driven background workers were
found (`grep` for `@Cron`/`@Process` across `src/` returns only the above).

---

## 20. Known Gaps / Incomplete Implementation

1. **Partner points-skip is keyed off the wrong flag.**
   `OrdersService.finalizeOrdersAsPaid` skips point-distribution queuing when
   `order.product.partnerAvailable === 1` — a flag on the *product row* (whether
   the product is *ever* listed for partner sale) — rather than
   `order.productType === CartType.PARTNER` (whether *this specific order* was
   actually placed through the partner channel). A product that is simultaneously
   `consumerAvailable = 1` and `partnerAvailable = 1` will **never** distribute
   points, even when purchased through the consumer flow. This is
   `PARTIALLY IMPLEMENTED` relative to the evident intent ("partner purchases
   don't earn points").
   File: `src/orders/orders.service.ts` (`finalizeOrdersAsPaid`).

2. **No user-type/role gate on reseller or partner purchasing.** Any
   authenticated user can add a `reseller` or `partner` cart line for any
   product opted into that catalog — there is no check against `user_type_id`
   or any "is this user a reseller" flag. `REFERENCED / NOT FULLY IMPLEMENTED`
   relative to the business idea of "resellers are a distinct class of user."
   Files: `src/cart/cart.service.ts`, `src/orders/orders.service.ts`.

3. **Reseller points are credited from the wrong source.** The buyer-facing
   preview (`ProductsService.loadBulkPointsSharingByProduct`) sources
   `totalPoints`/sharing breakdown from each `product_bulk_details` row's own
   `total_points`/`show_total_points`/`show_points_sharing`. The actual crediting
   engine (`PointDistributionQueueService.processPurchase`) instead reads
   `product.totalPoints` — the parent product's flat column — for every order
   regardless of `product_type`. A reseller purchase's points-per-unit is
   therefore whatever the *product's* `total_points` is, not the *package's*.
   This is a genuine `CURRENT IMPLEMENTATION vs BUSINESS INTENT` mismatch.
   Files: `src/products/products.service.ts` vs
   `src/point-distribution/services/point-distribution-queue.service.ts`.

4. **No inventory/stock decrement anywhere.** `products.stock` and
   `reward_mall_products.stock` exist and are shown to buyers
   (`stock_show`/`stock`), but no purchase path (`cart`, `orders`,
   `reward-mall-purchases`) ever decrements them. Only the boolean
   `is_out_of_stock` flag gates purchasability, and it is admin-set only.
   `NOT FOUND IN CURRENT CODEBASE`.

5. **No dedicated `point_transactions.transaction_reason` for mall redemption.**
   `RewardMallPurchasesService.purchase` writes `transactionReason: OTHER` with a
   descriptive `remarks` string, because the DB `ENUM` column has no
   `REWARD_MALL_REDEMPTION`-style value and adding one needs a migration (code
   comment explicitly documents this as a stand-in). `PARTIALLY IMPLEMENTED`.

6. **Inconsistent admin-role enforcement.** Of 41 controllers under an
   `admin/` route prefix, 4 do not apply `RolesGuard` + `@Roles('admin')`:
   `src/admin/admin.controller.ts` (likely admin login itself — expected to be
   open), `src/brand/admin/brand.controller.ts`,
   `src/cart/admin/cart.controller.ts`, `src/payment-option/admin/payment-option.controller.ts`.
   Additionally, within `ProductsAdminController`
   (`src/products/admin/product.controller.ts`), only `POST /admin/products`
   (create) is guarded by `RolesGuard`/`@Roles('admin')` — `PATCH
   /admin/products/:id` (which is how the consumer/reseller/partner max-quantity
   business rule from the task brief would be configured), `GET`, and `DELETE`
   are protected only by `JwtAuthGuard`, i.e. **any authenticated user**, not
   just admins, can currently change a product's price, quantity bounds, or
   points configuration through this endpoint. This is a real authorization
   gap, not a documentation nuance.

7. **`Refunded` payment status and the `order_status` id-5/"Cancelled"-vs-"Failed"
   naming mismatch.** `payment_status` id 4 ("Refunded") is seeded but never set
   by any code path — there is no refund flow for a paid order at all (no
   endpoint, no service method). Separately, `OrdersService`'s
   `FAILED_ORDER_STATUS_ID` constant is `5`, which the seed migration names
   `"Cancelled"`, not `"Failed"` — functionally consistent (both payment-failure
   and admin-cancellation paths would want to end an order the same way) but a
   naming trap for anyone reading raw `order_status_id` values.

8. **Coupon usage-limit enforcement is approximate.** `countCouponUsage` scans
   `order_snapshots.snapshot_data` JSON via `JSON_SEARCH` rather than maintaining
   a counter column — explicitly flagged as a known limitation in the code
   itself (`src/orders/checkout-pricing.service.ts`).

9. **Point pool has no distribution-out path.** `point_pools.distributed_points`
   exists as a column but is never written (the crediting line is commented
   out). Nothing in the codebase pays pool funds back out to users/admins —
   the pool is a one-way accumulation bucket as implemented today.
   `REFERENCED / NOT FULLY IMPLEMENTED`.

10. **No order cancellation/refund workflow, and no point/wallet reversal on
    any downstream failure after payment.** Once `finalizeOrdersAsPaid` has run
    (points queued/credited, cart cleared), there is no code path that reverses
    those effects — not for admin-initiated cancellation (`updateStatus` just
    flips status ids with no side effects), not for a gateway-side refund event
    (no `charge.refunded`/similar Stripe webhook case is handled), and not for
    CoinPayments. The only reversal logic that exists at all is the *pre-payment*
    wallet-debit rollback inside `checkout()` itself, for when the gateway
    session fails to create (§10 step 9) — that is unrelated to post-payment
    refunds. `NOT FOUND IN CURRENT CODEBASE` for post-payment reversal.

11. **`PointReceiverType.MERCHANT` and rule-level `ADMIN` receiver type are
    unused.** The enum defines them, but `PointDistributionQueueService` only
    ever reads `BUYER`, `UPLINE_LEVEL_1`, `UPLINE_LEVEL_2`, `POOL` rules — an
    admin-configured rule with `receiverType: MERCHANT` or `receiverType: ADMIN`
    would be silently ignored by the worker. `REFERENCED / NOT FULLY IMPLEMENTED`.

12. **`PointEventType` values other than `BUY_PRODUCT` are unused.**
    `SELL_PRODUCT`, `REFERRAL`, `POOL_DISTRIBUTION`, `ADMIN_ADJUSTMENT`, `BONUS`,
    `REFUND`, `OTHER` exist on the enum but no producer in the codebase ever
    creates a queue entry or rule lookup for them. `REFERENCED / NOT FULLY
    IMPLEMENTED`.

13. **Cron reconciliation re-entrancy guard is per-process, not distributed.**
    If the app is ever run as more than one instance, the in-memory boolean
    guards on the two 30-second reconciliation jobs would not prevent both
    instances from processing the same pending order concurrently. The
    idempotency of `markPaidBySessionId` (re-checking PENDING status before
    acting) mitigates the worst outcome (double point-crediting), but this is
    still a latent race under horizontal scaling. `PARTIALLY IMPLEMENTED`.

---

## 21. Quick Developer Reference

| Business Area | Main Module | Main Service | Main Table(s) | Main API |
|---|---|---|---|---|
| Consumer purchase | `src/products`, `src/cart`, `src/orders` | `ProductsService`, `CartService`, `OrdersService` | `products`, `cart`, `orders`, `order_snapshots` | `GET /products?type=consumer`, `POST /cart`, `POST /orders/checkout` |
| Reseller purchase | `src/product-bulk-details`, `src/cart`, `src/orders` | `ProductBulkDetailsService`, `CartService`, `OrdersService`, `CheckoutPricingService` | `products`, `product_bulk_details`, `cart`, `orders` | `GET /product-bulk-details/product/:id`, `POST /cart` (`cart_type=reseller`), `POST /orders/checkout` |
| Partner purchase | `src/products`, `src/cart`, `src/orders` | `CartService`, `OrdersService` | `products` (`partner_available`), `cart`, `orders` | `GET /products?type=partner`, `POST /cart` (`cart_type=partner`), `POST /orders/checkout` |
| Checkout pricing | `src/orders` | `CheckoutPricingService` | `product_extra_charges`, `product_add_ons`, `product_discounts`, `product_coupons`, `order_snapshots` | `GET /orders/checkout/pricing` |
| Payments | `src/orders`, `src/stripe`, `src/coinpayments` | `OrdersService`, `StripeService`, `CoinPaymentsService` | `orders`, `payment_options`, `crypto_currencies` | `POST /orders/checkout`, `POST /orders/webhook/stripe`, `POST /orders/webhook/coinpayments` |
| Points distribution | `src/point-distribution` | `PointDistributionQueueService` | `point_distributions`, `point_distribution_purchase_queue`, `point_user_balances`, `point_admin_balances`, `point_pools`, `point_transactions` | (background — enqueued from `OrdersService.finalizeOrdersAsPaid`); admin config via `GET/POST/PATCH/DELETE /admin/point-distribution` |
| Referral / upline | `src/users` | `UsersService` | `users` (`referral_id`) | Registration `referral_username`; `GET /users/my-team?level=1\|2` |
| Mall redemption | `src/reward-mall-products`, `src/reward-mall-purchases` | `RewardMallPurchasesService` | `reward_mall_products`, `reward_mall_purchase`, `point_user_balances`, `point_transactions` | `POST /reward-mall-purchases`, `GET /reward-mall-purchases/my` |
| Store-credit wallet | `src/vimas-e-wallet` | `VimasEWalletService` | `users` (`vimas_e_wallet_balance`), `vimas_e_wallet_transactions` | `GET /wallet/balance`, checkout `useWallet: true` |
| Coupons | `src/product-coupons` | `ProductCouponsService` (+ `CheckoutPricingService`) | `product_coupons` | `GET/POST/PATCH/DELETE /admin/product-coupons`; applied via `couponCodes` at checkout |
| Cart | `src/cart` | `CartService` | `cart` | `POST/PUT/DELETE/GET /cart` |
| Admin product config | `src/products` | `ProductsService` | `products` | `POST/PATCH/DELETE /admin/products/:id` (⚠ role-guard gap, see Known Gap #6) |
