import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cart, CartType } from '../shared/entities/cart.entity';
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { User } from '../shared/entities/user.entity';
import { OrderSnapshot } from '../shared/entities/order-snapshot.entity';
import { toProductType } from '../shared/utils/product-type.util';
import { ProductExtraChargesService } from '../product-extra-charges/product-extra-charges.service';
import { ProductAddOnsService } from '../product-add-ons/product-add-ons.service';
import { ProductCouponsService } from '../product-coupons/product-coupons.service';
import { ProductDiscountsService } from '../product-discounts/product-discounts.service';
import {
  ChargeCalculationBasis,
  ChargeCalculationType,
} from '../shared/entities/product-extra-charge.entity';
import { AddOnCalculationType } from '../shared/entities/product-add-on.entity';
import { DiscountType } from '../shared/entities/product-discount.entity';
import {
  CouponDiscountType,
  ProductCoupon,
} from '../shared/entities/product-coupon.entity';

export interface CheckoutPricingOptions {
  addOnIds?: number[];
  // One code per product — each is independently matched to its own cart
  // item (by productId) and validated (date window/minimum quantity/usage
  // limit) against that item alone. Two codes may never resolve to the
  // same product in one checkout.
  couponCodes?: string[];
  useWallet?: boolean;
}

export interface CheckoutPricingItem {
  cartItemId: number;
  productId: number;
  productName: string;
  cartType: CartType;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  extraCharges: Array<{
    id: number;
    name: string;
    calculationType: ChargeCalculationType;
    percentage: number;
    calculatedAmount: number;
  }>;
  addOns: Array<{
    id: number;
    name: string;
    quantity: number;
    calculatedAmount: number;
  }>;
  discounts: Array<{
    id: number;
    name: string;
    type: DiscountType;
    percentage: number;
    calculatedAmount: number;
  }>;
  coupon: {
    id: number;
    code: string;
    type: CouponDiscountType;
    percentage: number;
    calculatedAmount: number;
  } | null;
  extraChargesTotal: number;
  addOnsTotal: number;
  discountsTotal: number;
  couponTotal: number;
  payableBeforeWallet: number;
  walletShare: number;
  payableAfterWallet: number;
}

export interface CheckoutPricingResult {
  items: CheckoutPricingItem[];
  subtotal: number;
  extraChargesTotal: number;
  addOnsTotal: number;
  discountsTotal: number;
  couponTotal: number;
  grandPayableBeforeWallet: number;
  wallet: {
    active: boolean;
    availableBalance: number;
    requested: boolean;
    usedAmount: number;
  };
  finalAmount: number;
  snapshotData: Record<string, any>;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class CheckoutPricingService {
  constructor(
    @InjectRepository(ProductBulkDetail)
    private readonly bulkDetailRepo: Repository<ProductBulkDetail>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(OrderSnapshot)
    private readonly orderSnapshotRepo: Repository<OrderSnapshot>,

    private readonly extraChargesService: ProductExtraChargesService,
    private readonly addOnsService: ProductAddOnsService,
    private readonly couponsService: ProductCouponsService,
    private readonly discountsService: ProductDiscountsService,
  ) {}

  async calculate(
    buyerId: number,
    cartItems: Cart[],
    options: CheckoutPricingOptions,
  ): Promise<CheckoutPricingResult> {
    if (!cartItems.length) {
      throw new BadRequestException('Your cart is empty');
    }

    // Live per-item price. Consumer/partner: product's current
    // selling price net of its own product-level discount (unrelated to
    // the new product_discounts table). Reseller: the bulk package's
    // current total price — quantity for a reseller cart row means
    // "package count", not product units (see CartService).
    const resellerBulkDetailIds = cartItems
      .filter((item) => item.cart_type === CartType.RESELLER)
      .map((item) => item.productBulkDetailsId)
      .filter((id): id is number => !!id);

    const bulkDetailsById = new Map<number, ProductBulkDetail>(
      resellerBulkDetailIds.length
        ? (
            await this.bulkDetailRepo.find({
              where: { id: In(resellerBulkDetailIds) },
            })
          ).map((b) => [b.id, b])
        : [],
    );

    const items: CheckoutPricingItem[] = [];

    for (const cartItem of cartItems) {
      const productType = toProductType(cartItem.cart_type);
      let unitPrice: number;

      if (cartItem.cart_type === CartType.RESELLER) {
        const bulkDetail = cartItem.productBulkDetailsId
          ? bulkDetailsById.get(cartItem.productBulkDetailsId)
          : undefined;
        if (!bulkDetail || bulkDetail.status !== 1) {
          throw new BadRequestException(
            'Selected bulk package is no longer available for this product.',
          );
        }
        unitPrice = Number(bulkDetail.totalPrice);
      } else {
        const product = cartItem.product;
        const productDiscount =
          Number(product.discountAvailable) === 1
            ? Number(product.discountAmount) || 0
            : 0;
        unitPrice = Number(product.sellingPrice) - productDiscount;
      }

      const quantity = cartItem.quantity;
      const subtotal = round2(unitPrice * quantity);

      // --- extra charges ---
      const applicableCharges = await this.extraChargesService.findApplicable(
        cartItem.product.id,
        productType,
      );
      const extraCharges = applicableCharges.map((charge) => {
        const waived =
          charge.waiveAtQuantity != null && quantity >= charge.waiveAtQuantity;

        let calculatedAmount = 0;
        if (!waived) {
          const primary =
            charge.calculationType === ChargeCalculationType.PERCENTAGE
              ? subtotal * (Number(charge.percentage) / 100)
              : charge.calculationBasis === ChargeCalculationBasis.QUANTITY
                ? Number(charge.amount) * quantity
                : Number(charge.amount);
          const fixed =
            charge.fixedAmountBasis === ChargeCalculationBasis.QUANTITY
              ? Number(charge.fixedAmount) * quantity
              : Number(charge.fixedAmount);
          calculatedAmount = round2(primary + fixed);
        }

        return {
          id: charge.id,
          name: charge.name,
          calculationType: charge.calculationType,
          percentage: Number(charge.percentage),
          calculatedAmount,
        };
      });
      const extraChargesTotal = round2(
        extraCharges.reduce((sum, c) => sum + c.calculatedAmount, 0),
      );

      // --- add-ons (opt-in only) ---
      const requestedAddOnIds = (options.addOnIds ?? []).length
        ? await this.addOnsService.findByIds(options.addOnIds ?? [])
        : [];
      const addOnsForItem = requestedAddOnIds.filter(
        (a) => a.productId === cartItem.product.id,
      );
      const addOns = addOnsForItem.map((addOn) => {
        if (!addOn.isActive) {
          throw new BadRequestException(
            `Add-on "${addOn.name}" is not currently available`,
          );
        }
        if (addOn.productType !== productType) {
          throw new BadRequestException(
            `Add-on "${addOn.name}" is not applicable to this product type`,
          );
        }
        if (
          addOn.applicableMinimumQuantity != null &&
          quantity < addOn.applicableMinimumQuantity
        ) {
          throw new BadRequestException(
            `Add-on "${addOn.name}" requires a minimum quantity of ${addOn.applicableMinimumQuantity}`,
          );
        }

        const base =
          addOn.calculationType === AddOnCalculationType.PERCENTAGE
            ? subtotal * (Number(addOn.percentage) / 100)
            : Number(addOn.amount);
        const calculatedAmount = round2(
          addOn.costPerUnit ? base * quantity : base,
        );

        return {
          id: addOn.id,
          name: addOn.name,
          quantity,
          calculatedAmount,
        };
      });
      const addOnsTotal = round2(
        addOns.reduce((sum, a) => sum + a.calculatedAmount, 0),
      );

      // --- automatic discounts (best one wins — no stacking column) ---
      const now = new Date();
      const applicableDiscounts = (
        await this.discountsService.findApplicable(
          cartItem.product.id,
          productType,
        )
      ).filter((d) => {
        if (d.minimumQuantity != null && quantity < d.minimumQuantity)
          return false;
        if (d.startAt && now < new Date(d.startAt)) return false;
        if (d.endAt && now > new Date(d.endAt)) return false;
        return true;
      });

      let bestDiscount: {
        id: number;
        name: string;
        type: DiscountType;
        percentage: number;
        calculatedAmount: number;
      } | null = null;
      for (const d of applicableDiscounts) {
        const raw =
          d.discountType === DiscountType.PERCENTAGE
            ? subtotal * (Number(d.percentage) / 100)
            : Number(d.amount);
        const capped =
          d.discountType === DiscountType.PERCENTAGE &&
          d.maximumDiscountAmount != null
            ? Math.min(raw, Number(d.maximumDiscountAmount))
            : raw;
        const calculatedAmount = round2(Math.min(capped, subtotal));
        if (!bestDiscount || calculatedAmount > bestDiscount.calculatedAmount) {
          bestDiscount = {
            id: d.id,
            name: d.name,
            type: d.discountType,
            percentage: Number(d.percentage),
            calculatedAmount,
          };
        }
      }
      const discounts = bestDiscount ? [bestDiscount] : [];
      const discountsTotal = bestDiscount ? bestDiscount.calculatedAmount : 0;

      items.push({
        cartItemId: cartItem.id,
        productId: cartItem.product.id,
        productName: cartItem.product.name,
        cartType: cartItem.cart_type,
        quantity,
        unitPrice,
        subtotal,
        extraCharges,
        addOns,
        discounts,
        coupon: null,
        extraChargesTotal,
        addOnsTotal,
        discountsTotal,
        couponTotal: 0,
        payableBeforeWallet: 0, // filled in after coupon is resolved below
        walletShare: 0,
        payableAfterWallet: 0,
      });
    }

    // --- coupons (one per product) ---
    // Each requested code is matched to its own cart item independently —
    // unlike add-ons/discounts, a coupon is opt-in and identified by a
    // code rather than product+type alone, so every code gets its own
    // validity/usage-limit check and its own item. Two codes resolving to
    // the same product is a conflict (whichever comes second is rejected)
    // rather than silently overwriting the first.
    const requestedCouponCodes = [
      ...new Set((options.couponCodes ?? []).map((c) => c?.trim())),
    ].filter((code): code is string => !!code);

    for (const code of requestedCouponCodes) {
      const candidates = await this.couponsService.findActiveByCode(code);
      const now = new Date();

      let matchedItem: CheckoutPricingItem | null = null;
      let matchedCoupon: ProductCoupon | null = null;

      for (const coupon of candidates) {
        const item = items.find((i) => i.productId === coupon.productId);
        if (!item) continue;
        if (toProductType(item.cartType) !== coupon.productType) continue;
        if (coupon.startAt && now < new Date(coupon.startAt)) continue;
        if (coupon.endAt && now > new Date(coupon.endAt)) continue;
        if (
          coupon.minimumQuantity != null &&
          item.quantity < coupon.minimumQuantity
        )
          continue;

        matchedItem = item;
        matchedCoupon = coupon;
        break;
      }

      if (!matchedItem || !matchedCoupon) {
        throw new BadRequestException(
          `Coupon "${code}" is invalid or not applicable to any item in your cart`,
        );
      }

      if (matchedItem.coupon) {
        throw new BadRequestException(
          `Cannot apply coupon "${code}" — "${matchedItem.productName}" already has coupon "${matchedItem.coupon.code}" applied`,
        );
      }

      if (matchedCoupon.usageLimit != null) {
        const usedCount = await this.countCouponUsage(matchedCoupon.code);
        if (usedCount >= matchedCoupon.usageLimit) {
          throw new BadRequestException(
            `Coupon "${code}" has reached its usage limit`,
          );
        }
      }

      const raw =
        matchedCoupon.discountType === CouponDiscountType.PERCENTAGE
          ? matchedItem.subtotal * (Number(matchedCoupon.percentage) / 100)
          : Number(matchedCoupon.amount);
      const capped =
        matchedCoupon.discountType === CouponDiscountType.PERCENTAGE &&
        matchedCoupon.maximumDiscountAmount != null
          ? Math.min(raw, Number(matchedCoupon.maximumDiscountAmount))
          : raw;
      const calculatedAmount = round2(
        Math.min(capped, matchedItem.subtotal - matchedItem.discountsTotal),
      );

      matchedItem.coupon = {
        id: matchedCoupon.id,
        code: matchedCoupon.code,
        type: matchedCoupon.discountType,
        percentage: Number(matchedCoupon.percentage),
        calculatedAmount: Math.max(calculatedAmount, 0),
      };
      matchedItem.couponTotal = matchedItem.coupon.calculatedAmount;
    }

    // --- per-item payable before wallet ---
    for (const item of items) {
      item.payableBeforeWallet = round2(
        Math.max(
          item.subtotal +
            item.extraChargesTotal +
            item.addOnsTotal -
            item.discountsTotal -
            item.couponTotal,
          0,
        ),
      );
    }

    const grandPayableBeforeWallet = round2(
      items.reduce((sum, i) => sum + i.payableBeforeWallet, 0),
    );

    // --- wallet ---
    const buyer = await this.userRepo.findOne({ where: { id: buyerId } });
    const walletActive = !!buyer && Number(buyer.vimasEWalletStatus) === 1;
    const availableBalance = buyer ? Number(buyer.vimasEWalletBalance) : 0;
    const walletRequested = !!options.useWallet && walletActive;
    let walletUsed = 0;

    if (walletRequested && grandPayableBeforeWallet > 0) {
      walletUsed = round2(Math.min(availableBalance, grandPayableBeforeWallet));
    }

    // Distribute the wallet deduction back onto items, proportionally by
    // each item's share of the pre-wallet payable total. The last item
    // absorbs the rounding remainder so the sum is always exact.
    let allocated = 0;
    items.forEach((item, idx) => {
      const isLast = idx === items.length - 1;
      let share = 0;
      if (walletUsed > 0 && grandPayableBeforeWallet > 0) {
        share = isLast
          ? round2(walletUsed - allocated)
          : round2(
              (item.payableBeforeWallet / grandPayableBeforeWallet) *
                walletUsed,
            );
        allocated = round2(allocated + share);
      }
      item.walletShare = share;
      item.payableAfterWallet = round2(item.payableBeforeWallet - share);
    });

    const finalAmount = round2(grandPayableBeforeWallet - walletUsed);

    const subtotal = round2(items.reduce((s, i) => s + i.subtotal, 0));
    const extraChargesTotal = round2(
      items.reduce((s, i) => s + i.extraChargesTotal, 0),
    );
    const addOnsTotal = round2(items.reduce((s, i) => s + i.addOnsTotal, 0));
    const discountsTotal = round2(
      items.reduce((s, i) => s + i.discountsTotal, 0),
    );
    const couponTotal = round2(items.reduce((s, i) => s + i.couponTotal, 0));

    const snapshotData = {
      items: items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        product_type: toProductType(i.cartType),
        quantity: i.quantity,
        unit_price: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal,
      extra_charges: items.flatMap((i) =>
        i.extraCharges.map((c) => ({
          product_id: i.productId,
          type: c.calculationType,
          name: c.name,
          percentage: c.percentage,
          amount: c.calculatedAmount,
          calculated_amount: c.calculatedAmount,
        })),
      ),
      add_ons: items.flatMap((i) =>
        i.addOns.map((a) => ({
          id: a.id,
          product_id: i.productId,
          name: a.name,
          quantity: a.quantity,
          calculated_amount: a.calculatedAmount,
        })),
      ),
      discounts: items.flatMap((i) =>
        i.discounts.map((d) => ({
          id: d.id,
          product_id: i.productId,
          name: d.name,
          type: d.type,
          percentage: d.percentage,
          calculated_amount: d.calculatedAmount,
        })),
      ),
      coupons: items
        .filter((i) => i.coupon)
        .map((i) => ({
          id: i.coupon!.id,
          product_id: i.productId,
          code: i.coupon!.code,
          type: i.coupon!.type,
          percentage: i.coupon!.percentage,
          calculated_amount: i.coupon!.calculatedAmount,
        })),
      wallet: {
        active: walletActive,
        available_balance: availableBalance,
        used_amount: walletUsed,
      },
      final_amount: finalAmount,
    };

    return {
      items,
      subtotal,
      extraChargesTotal,
      addOnsTotal,
      discountsTotal,
      couponTotal,
      grandPayableBeforeWallet,
      wallet: {
        active: walletActive,
        availableBalance,
        requested: walletRequested,
        usedAmount: walletUsed,
      },
      finalAmount,
      snapshotData,
    };
  }

  // Approximates usage_limit enforcement for product_coupons — the schema
  // has no dedicated usage counter, so this scans committed order_snapshots
  // for the coupon code. Not indexed; acceptable at expected coupon-usage
  // volume, flagged as a known limitation.
  private async countCouponUsage(code: string): Promise<number> {
    const result = await this.orderSnapshotRepo
      .createQueryBuilder('snapshot')
      .where(
        `JSON_SEARCH(snapshot.snapshot_data, 'one', :code, NULL, '$.coupons[*].code') IS NOT NULL`,
        { code },
      )
      .getCount();
    return result;
  }
}
