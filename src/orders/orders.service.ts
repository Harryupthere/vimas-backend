import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { Order } from '../shared/entities/order.entity';
import { OrderSnapshot } from '../shared/entities/order-snapshot.entity';
import { Cart, CartType } from '../shared/entities/cart.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { CryptoCurrency } from '../shared/entities/crypto-currency.entity';
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { StripeService } from '../stripe/stripe.service';
import { CoinPaymentsService } from '../coinpayments/coinpayments.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AdminUpdateOrderDto } from './dto/admin-update-order.dto';
import { PointDistributionPurchaseQueue } from '../shared/entities/point-distribution-purchase-queue.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationCategoryName,
  NotificationTypeName,
} from '../notifications/notification-names';
import { CheckoutPricingService } from './checkout-pricing.service';
import { VimasEWalletService } from '../vimas-e-wallet/vimas-e-wallet.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { generateInvoiceId } from '../shared/utils/invoice-id.util';
const PENDING_PAYMENT_STATUS_ID = 1;
const PAID_PAYMENT_STATUS_ID = 2;
const FAILED_PAYMENT_STATUS_ID = 3;
const CONFIRMED_ORDER_STATUS_ID = 2;
const FAILED_ORDER_STATUS_ID = 5;

const USDT_CURRENCY = {
  1: '54:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  4: '4:0xdac17f958d2ee523a2206206994597c13d831ec7',
  2: '35:0x55d398326f99059ff775485246999027b3197955',
  3: '9:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
};

// A payment_options row activates the CoinPayments checkout path if its
// name contains any of these (case-insensitive) — anything else selected
// still goes through Stripe, same as today. Matched by substring rather
// than an exact name because admins won't necessarily type "CoinPayments"
// verbatim (e.g. an existing row here is named "Coin Payment Crypto
// Currency").
const COINPAYMENTS_NAME_KEYWORDS = ['coinpayment', 'coin payment', 'crypto'];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // guards against a slow Stripe round-trip still being in flight when the
  // next scheduled tick fires
  private isReconcilingPendingOrders = false;
  // same guard, separate flag — Stripe and CoinPayments reconciliation
  // run as independent cron ticks
  private isReconcilingCoinPaymentsOrders = false;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderSnapshot)
    private readonly orderSnapshotRepo: Repository<OrderSnapshot>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,

    @InjectRepository(PaymentOption)
    private readonly paymentOptionRepo: Repository<PaymentOption>,

    @InjectRepository(CryptoCurrency)
    private readonly cryptoCurrencyRepo: Repository<CryptoCurrency>,

    @InjectRepository(ProductBulkDetail)
    private readonly bulkDetailRepo: Repository<ProductBulkDetail>,

    @InjectRepository(PointDistributionPurchaseQueue)
    private readonly pointDistributionPurchaseQueueRepo: Repository<PointDistributionPurchaseQueue>,

    @InjectQueue('point-distribution')
    private readonly pointDistributionQueue: Queue,

    private readonly stripeService: StripeService,
    private readonly coinPaymentsService: CoinPaymentsService,
    private readonly notificationsService: NotificationsService,
    private readonly checkoutPricingService: CheckoutPricingService,
    private readonly walletService: VimasEWalletService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  private isCoinPaymentsOptionName(name?: string | null): boolean {
    const normalized = (name ?? '').toLowerCase();
    return COINPAYMENTS_NAME_KEYWORDS.some((keyword) =>
      normalized.includes(keyword),
    );
  }

  // orders.invoice_id carries no DB-level unique constraint (only an
  // index), so a collision wouldn't be caught by the database itself —
  // check-and-regenerate here instead. nanoid's keyspace at this length
  // makes an actual collision astronomically unlikely; this is cheap
  // insurance, not a load-bearing guarantee.
  private async generateUniqueInvoiceId(
    orderRepo: Repository<Order>,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateInvoiceId();
      const clash = await orderRepo.findOne({
        where: { invoiceId: candidate },
      });
      if (!clash) return candidate;
    }
    throw new InternalServerErrorException(
      'Failed to generate a unique invoice id',
    );
  }

  async checkout(buyerId: number, dto: CheckoutDto) {
    const cartItems = await this.cartRepo.find({
      where: { buyer: { id: buyerId } },
    });
    if (!cartItems.length) {
      throw new BadRequestException('Your cart is empty');
    }

    const contactInfo = await this.contactInfoRepo.findOne({
      where: { id: dto.contactInfoId, userId: buyerId },
    });
    if (!contactInfo) {
      throw new NotFoundException('Contact info not found');
    }

    const paymentOptionId = dto.paymentOptionId ?? 1;
    const paymentOption = await this.paymentOptionRepo.findOne({
      where: { id: paymentOptionId },
    });
    if (!paymentOption) {
      throw new NotFoundException('Payment option not found');
    }

    // Flat fee for using this payment option — added on top of the cart
    // subtotal as its own separate line item in the checkout session
    // (both Stripe and CoinPayments; see createStripeCheckout /
    // createCoinPaymentsCheckout below), so the buyer is actually charged
    // product cost + gateway fee, matching whatever the admin configured
    // on this payment_options row. It's kept out of the order rows
    // entirely (not folded into totalAmount/totalAmountPaid) since it
    // isn't tied to any one product — see CheckoutPricingService for what
    // IS folded into each order's totalAmount (pure product subtotal) and
    // totalAmountPaid (subtotal + that item's extra charges/add-ons -
    // discounts/coupon - its share of any wallet applied).
    const paymentCharges = Number(paymentOption.charges) || 0;

    // Re-validate quantity bounds at checkout time — the product's bounds
    // (or a reseller package's active status) may have changed since the
    // item was added to the cart. Consumer/partner are checked against the
    // product's own min/max columns; reseller is checked against the
    // product_bulk_details package itself rather than a product-level
    // bound (see CartService.getQuantityBounds for the same split at
    // add-to-cart time).
    const resellerBulkDetailIds = cartItems
      .filter((item) => item.cart_type === CartType.RESELLER)
      .map((item) => item.productBulkDetailsId)
      .filter((id): id is number => !!id);

    const activeBulkDetailIds = new Set(
      resellerBulkDetailIds.length
        ? (
            await this.bulkDetailRepo.find({
              where: { id: In(resellerBulkDetailIds), status: 1 },
            })
          ).map((b) => b.id)
        : [],
    );

    // Quantity-bound validation — independent of pricing, kept exactly as
    // before (re-checked here because the product's bounds, or a reseller
    // package's active status, may have changed since the item was added
    // to the cart).
    for (const item of cartItems) {
      if (item.cart_type === CartType.RESELLER) {
        if (
          !item.productBulkDetailsId ||
          !activeBulkDetailIds.has(item.productBulkDetailsId)
        ) {
          throw new BadRequestException(
            'Selected bulk package is no longer available for this product.',
          );
        }
      } else if (item.cart_type === CartType.PARTNER) {
        const min = item.product.partnerMinimumQuantity;
        const max = item.product.partnerMaximumQuantity;
        if (item.quantity < min || item.quantity > max) {
          throw new BadRequestException(
            `Quantity for this partner item must be between ${min} and ${max}.`,
          );
        }
      } else {
        const min = item.product.consumerMinimumQuantity;
        const max = item.product.consumerMaximumQuantity;
        if (item.quantity < min || item.quantity > max) {
          throw new BadRequestException(
            `Quantity for this consumer item must be between ${min} and ${max}.`,
          );
        }
      }
    }

    // Server-side pricing — extra charges, add-ons, coupons (one per
    // product), automatic discounts, wallet. Throws for any invalid/
    // inapplicable coupon or add-on before anything is written to the DB.
    // See CheckoutPricingService for the full breakdown; nothing here
    // trusts amounts from the client — only the selections
    // (couponCodes/addOnIds/useWallet) do.
    const pricing = await this.checkoutPricingService.calculate(
      buyerId,
      cartItems,
      {
        addOnIds: dto.addOnIds,
        couponCodes: dto.couponCodes,
        useWallet: dto.useWallet,
      },
    );
    const pricingByCartItemId = new Map(
      pricing.items.map((i) => [i.cartItemId, i]),
    );

    // Order + order_snapshot + wallet deduction are created atomically —
    // if anything fails here, nothing is written (requirement #14).
    const { savedOrders, snapshotId, walletUsed } =
      await this.orderRepo.manager.transaction(async (manager) => {
        const orderSnapshotRepo = manager.getRepository(OrderSnapshot);
        const orderRepo = manager.getRepository(Order);

        const snapshot = await orderSnapshotRepo.save(
          orderSnapshotRepo.create({
            totalAmount: pricing.finalAmount,
            currency: 'MYR',
            snapshotData: pricing.snapshotData,
          }),
        );

        const orders = cartItems.map((item) => {
          const p = pricingByCartItemId.get(item.id);
          if (!p) {
            // Should never happen — every cart item is priced above.
            throw new BadRequestException('Failed to price cart item');
          }
          return orderRepo.create({
            orderSnapshotId: snapshot.id,
            buyerId,
            productId: item.product.id,
            productType: item.cart_type,
            buyerContactDetailsId: contactInfo.id,
            paymentOptionId,
            quantity: item.quantity,
            singleUnitPrice: p.unitPrice,
            totalAmount: p.subtotal,
            totalAmountPaid: p.payableAfterWallet,
          });
        });

        const saved = await orderRepo.save(orders);

        // Every row from this checkout gets the same invoice_id — assigned
        // here, keyed off the snapshot just created (order_snapshot_id is
        // set on every row above, for all three payment paths), not
        // payment_gateway_id: that column isn't written until later
        // (createStripeCheckout/createCoinPaymentsCheckout, after this
        // transaction commits) and never gets written at all for a
        // wallet-only checkout (see the `totalPayableViaGateway <= 0`
        // branch below).
        const invoiceId = await this.generateUniqueInvoiceId(orderRepo);
        await orderRepo.update(
          { id: In(saved.map((o) => o.id)) },
          { invoiceId },
        );
        saved.forEach((order) => {
          order.invoiceId = invoiceId;
        });

        if (pricing.wallet.usedAmount > 0) {
          await this.walletService.debitForCheckout(
            manager,
            buyerId,
            pricing.wallet.usedAmount,
            snapshot.id,
          );
        }

        return {
          savedOrders: saved,
          snapshotId: snapshot.id,
          walletUsed: pricing.wallet.usedAmount,
        };
      });

    const orderIds = savedOrders.map((o) => o.id);
    const totalPayableViaGateway = savedOrders.reduce(
      (sum, o) => sum + Number(o.totalAmountPaid),
      0,
    );

    try {
      // Wallet covered the entire order — nothing left to charge, skip the
      // payment gateway and finalize immediately.
      if (totalPayableViaGateway <= 0) {
        await this.orderRepo.update(
          { id: In(orderIds) },
          {
            paymentStatusId: PAID_PAYMENT_STATUS_ID,
            orderStatusId: CONFIRMED_ORDER_STATUS_ID,
          },
        );
        const ordersWithProduct = await this.orderRepo.find({
          where: { id: In(orderIds) },
          relations: ['product'],
        });
        await this.finalizeOrdersAsPaid(ordersWithProduct);

        // Wallet-only order never touches a payment gateway, so there's no
        // gateway checkout page to send the buyer to — instead point the
        // frontend straight at the app's own confirm page, keyed by this
        // checkout's invoice id (same query params the gateway success_urls
        // use elsewhere, minus the gateway session id).
        const invoiceId = savedOrders[0]?.invoiceId ?? null;
        const appUrl = process.env.APP_URL || '';
        const checkoutUrl = invoiceId
          ? `${appUrl}dashboard/confirm?checkout=success&checkout_id=${invoiceId}`
          : null;

        return {
          data: {
            checkoutUrl,
            sessionId: null,
            paidByWallet: true,
            invoiceId,
          },
          message: 'Order paid in full using your wallet balance',
        };
      }

      const isCoinPayments = this.isCoinPaymentsOptionName(paymentOption.name);

      if (isCoinPayments) {
        return await this.createCoinPaymentsCheckout(
          dto,
          cartItems,
          savedOrders,
          orderIds,
          paymentCharges,
        );
      }

      return await this.createStripeCheckout(
        cartItems,
        savedOrders,
        orderIds,
        paymentCharges,
      );
    } catch (err) {
      console.log(err);
      // Order + snapshot + wallet debit already committed above — since the
      // gateway step failed (createStripeCheckout/createCoinPaymentsCheckout
      // already deleted the orders themselves), also reverse the wallet
      // deduction and drop the now-orphaned snapshot so nothing is left
      // half-applied.
      if (walletUsed > 0) {
        await this.walletService.refundForCheckout(
          buyerId,
          walletUsed,
          snapshotId,
        );
      }
      //await this.orderSnapshotRepo.delete({ id: snapshotId });
      throw err;
    }
  }

  // Buyer-facing checkout-page preview: same calculation as checkout()
  // itself (via CheckoutPricingService), but read-only — no order/snapshot
  // is written. Lets the frontend show live totals as the buyer toggles
  // add-ons / enters a coupon / opts into the wallet.
  async previewCheckoutPricing(
    buyerId: number,
    options: {
      addOnIds?: number[];
      couponCodes?: string[];
      useWallet?: boolean;
    },
  ) {
    const cartItems = await this.cartRepo.find({
      where: { buyer: { id: buyerId } },
    });
    const pricing = await this.checkoutPricingService.calculate(
      buyerId,
      cartItems,
      options,
    );
    return {
      data: pricing,
      message: 'Checkout pricing calculated successfully',
    };
  }

  private async createStripeCheckout(
    cartItems: Cart[],
    savedOrders: Order[],
    orderIds: number[],
    paymentCharges: number,
  ) {
    let session: Stripe.Checkout.Session;
    try {
      const currency = process.env.STRIPE_CURRENCY || 'myr';
      const appUrl = process.env.APP_URL || '';

      const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
        savedOrders.map((order, idx) => ({
          quantity: order.quantity,
          price_data: {
            currency,
            // Discounted per-unit price, derived from the order total
            // rather than a stored discount_amount column (dropped —
            // pricing breakdowns now live in order_snapshots instead).
            unit_amount: Math.round(
              (Number(order.totalAmountPaid) / order.quantity) * 100,
            ),
            product_data: {
              name: cartItems[idx].product.name,
            },
          },
        }));

      if (paymentCharges > 0) {
        line_items.push({
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(paymentCharges * 100),
            product_data: { name: 'Payment processing fee' },
          },
        });
      }

      session = await this.stripeService.createCheckoutSession({
        mode: 'payment',
        line_items,
        metadata: { orderIds: orderIds.join(',') },
        payment_intent_data: {
          metadata: { orderIds: orderIds.join(',') },
        },
        success_url: `${appUrl}dashboard/confirm?checkout=success&checkout_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/failed?checkout_id={CHECKOUT_SESSION_ID}`,
      });
    } catch (err) {
      await this.orderRepo.delete({ id: In(orderIds) });

      throw new InternalServerErrorException(
        'Failed to create Stripe checkout session',
      );
    }

    await this.orderRepo.update(
      { id: In(orderIds) },
      { paymentGatewayId: session.id },
    );

    return {
      data: { checkoutUrl: session.url, sessionId: session.id },
      message: 'Checkout session created successfully',
    };
  }

  // Same response shape as Stripe ({ checkoutUrl, sessionId }) so the
  // frontend doesn't need gateway-specific handling — sessionId here is
  // the CoinPayments invoice id, which becomes the order's
  // paymentGatewayId exactly like a Stripe session id does, so
  // markPaidBySessionId/webhook/cron reconciliation all work unchanged
  // regardless of which gateway was used.
  private async createCoinPaymentsCheckout(
    dto: CheckoutDto,
    cartItems: Cart[],
    savedOrders: Order[],
    orderIds: number[],
    paymentCharges: number,
  ) {
    if (!dto.cryptoCurrencyId) {
      await this.orderRepo.delete({ id: In(orderIds) });
      throw new BadRequestException(
        'cryptoCurrencyId is required when paying with CoinPayments',
      );
    }

    const cryptoCurrency = await this.cryptoCurrencyRepo.findOne({
      where: { id: dto.cryptoCurrencyId, status: 1 },
    });
    if (!cryptoCurrency) {
      await this.orderRepo.delete({ id: In(orderIds) });
      throw new NotFoundException('Crypto currency not found');
    }

    // Same two-leg conversion as CryptoCurrenciesService.convertAmountToCrypto:
    // CoinPayments quotes rates against USDT most reliably, so we hop
    // MYR -> USDT -> selected coin instead of asking for a direct MYR -> coin
    // rate.
    const usdtCurrency = USDT_CURRENCY[dto.cryptoCurrencyId] || 'USDT';

    // Leg 1: fiat (MYR) -> USDT
    const fiatToUsdtRate = process.env.FIAT_TO_USDT_RATE
      ? parseFloat(process.env.FIAT_TO_USDT_RATE)
      : 0.25;

    // Leg 2: USDT -> selected crypto currency
    const usdtToCryptoRate = await this.coinPaymentsService.getRate(
      usdtCurrency,
      cryptoCurrency.coinpaymentId,
    );
    const decimals = cryptoCurrency.decimalPlaces ?? 8;
    const rate = fiatToUsdtRate * usdtToCryptoRate;

    const items = savedOrders.map((order, idx) => ({
      name: cartItems[idx].product.name,
      quantity: { value: order.quantity, type: 2 },
      amount: (Number(order.totalAmountPaid) * rate).toFixed(decimals),
    }));

    if (paymentCharges > 0) {
      items.push({
        name: 'Payment processing fee',
        quantity: { value: 1, type: 2 },
        amount: (paymentCharges * rate).toFixed(decimals),
      });
    }

    const finalAmount = items
      .reduce((sum, item) => sum + Number(item.amount), 0)
      .toFixed(decimals);

    const invoiceId = randomUUID();
    const appUrl = process.env.APP_URL || '';
    const webhookUrl =
      process.env.COINPAYMENTS_WEBHOOK_URL ||
      `${process.env.API_BASE_URL || appUrl}api/vimas/orders/webhook/coinpayments`;

    const payload = {
      currency: cryptoCurrency.coinpaymentId,
      clientId: this.coinPaymentsService.clientId,
      invoiceId,
      items,
      amount: {
        breakdown: { subtotal: finalAmount },
        total: finalAmount,
      },
      successUrl: `${appUrl}dashboard/confirm?checkout=success&checkout_id=${invoiceId}`,
      cancelUrl: `${appUrl}dashboard/failed?checkout=cancel&checkout_id=${invoiceId}`,
      webhooks: [
        {
          notificationsUrl: webhookUrl,
          notifications: [
            'invoiceCreated',
            'invoicePending',
            'invoicePaid',
            'invoiceCompleted',
            'invoiceCancelled',
            'invoiceTimedOut',
          ],
        },
      ],
    };

    let invoiceResponse: any;
    try {
      invoiceResponse = await this.coinPaymentsService.createInvoice(payload);
    } catch (err) {
      await this.orderRepo.delete({ id: In(orderIds) });
      throw new InternalServerErrorException(
        'Failed to create CoinPayments invoice',
      );
    }

    const invoice = invoiceResponse?.invoices?.[0];
    if (!invoice) {
      await this.orderRepo.delete({ id: In(orderIds) });
      throw new InternalServerErrorException(
        'Invalid CoinPayments invoice creation response',
      );
    }

    await this.orderRepo.update(
      { id: In(orderIds) },
      { paymentGatewayId: invoice.id },
    );

    return {
      data: { checkoutUrl: invoice.checkoutLink, sessionId: invoice.id },
      message: 'Checkout session created successfully',
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    console.log('===================== WEBHOOK =============');

    const event = this.stripeService.constructEvent(rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.markPaidBySessionId(session.id);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        await this.orderRepo.update(
          {
            paymentGatewayId: session.id,
            paymentStatusId: PENDING_PAYMENT_STATUS_ID,
          },
          {
            paymentStatusId: FAILED_PAYMENT_STATUS_ID,
            orderStatusId: FAILED_ORDER_STATUS_ID,
          },
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const idsRaw = paymentIntent.metadata?.orderIds;
        if (idsRaw) {
          const ids = idsRaw
            .split(',')
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id));
          if (ids.length) {
            await this.orderRepo.update(
              { id: In(ids), paymentStatusId: PENDING_PAYMENT_STATUS_ID },
              {
                paymentStatusId: FAILED_PAYMENT_STATUS_ID,
                orderStatusId: FAILED_ORDER_STATUS_ID,
              },
            );
          }
        }
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  // Fallback for when the Stripe webhook isn't reaching us: periodically
  // re-checks every order still sitting in PENDING against Stripe directly
  // and reconciles it. Reuses markPaidBySessionId for the "paid" case so a
  // late reconciliation still triggers cart-clearing and point distribution
  // exactly like the webhook path would have.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async reconcilePendingOrdersWithStripe(): Promise<void> {
    console.log('Fecthing pending orders');
    if (this.isReconcilingPendingOrders) {
      this.logger.warn(
        'Previous pending-orders reconciliation run is still in progress, skipping this tick',
      );
      return;
    }
    this.isReconcilingPendingOrders = true;

    try {
      // Excludes CoinPayments orders — those are reconciled separately in
      // reconcilePendingOrdersWithCoinPayments, since a CoinPayments
      // invoice id means nothing to Stripe's API. Keep these LIKE
      // patterns in sync with COINPAYMENTS_NAME_KEYWORDS above.
      const pendingOrders = await this.orderRepo
        .createQueryBuilder('order')
        .leftJoin('order.paymentOption', 'paymentOption')
        .where('order.payment_status_id = :status', {
          status: PENDING_PAYMENT_STATUS_ID,
        })
        .andWhere(
          `(paymentOption.name IS NULL
            OR (LOWER(paymentOption.name) NOT LIKE '%coinpayment%'
              AND LOWER(paymentOption.name) NOT LIKE '%coin payment%'
              AND LOWER(paymentOption.name) NOT LIKE '%crypto%'))`,
        )
        .getMany();

      const sessionIds = [
        ...new Set(
          pendingOrders
            .map((o) => o.paymentGatewayId)
            .filter((id): id is string => !!id),
        ),
      ];

      if (!sessionIds.length) return;

      this.logger.log(
        `Reconciling ${sessionIds.length} pending Stripe session(s) against pending orders`,
      );
      console.log(
        `Reconciling ${sessionIds.length} pending Stripe session(s) against pending orders`,
      );

      for (const sessionId of sessionIds) {
        try {
          const session =
            await this.stripeService.retrieveCheckoutSession(sessionId);
          if (session.payment_status === 'paid') {
            await this.markPaidBySessionId(sessionId);
            this.logger.log(`Session ${sessionId} reconciled as paid`);
          } else if (session.status === 'expired') {
            const result = await this.orderRepo.update(
              {
                paymentGatewayId: sessionId,
                paymentStatusId: PENDING_PAYMENT_STATUS_ID,
              },
              {
                paymentStatusId: FAILED_PAYMENT_STATUS_ID,
                orderStatusId: FAILED_ORDER_STATUS_ID,
              },
            );
            if (result.affected) {
              this.logger.log(`Session ${sessionId} reconciled as expired`);
            }
          }
          // status 'open' / payment_status 'unpaid' — still genuinely
          // pending (buyer hasn't finished checkout yet), leave as-is
        } catch (err) {
          this.logger.error(
            `Failed to reconcile Stripe session ${sessionId}: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }
    } finally {
      this.isReconcilingPendingOrders = false;
    }
  }

  // Signature-verified via CoinPaymentsService (HMAC-SHA256 over the raw
  // body with the merchant private key) — same trust model as the Stripe
  // webhook above, just a different signing scheme.
  async handleCoinPaymentsWebhook(rawBody: Buffer, signature: string) {
    const isValid = this.coinPaymentsService.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      this.logger.warn('CoinPayments webhook signature verification failed');
      throw new BadRequestException('Invalid CoinPayments signature');
    }

    const body = JSON.parse(rawBody.toString('utf8')) as {
      id?: string;
      invoiceId?: string;
      status?: string;
      type?: string;
    };
    const invoiceId = body.id ?? body.invoiceId;
    const invoiceStatus = body.status ?? body.type;

    if (!invoiceId) {
      throw new BadRequestException(
        'Missing invoice id in CoinPayments webhook payload',
      );
    }

    const status = this.mapCoinPaymentsStatus(invoiceStatus);
    if (status === 'paid') {
      await this.markPaidBySessionId(invoiceId);
    } else if (status === 'failed') {
      await this.orderRepo.update(
        {
          paymentGatewayId: invoiceId,
          paymentStatusId: PENDING_PAYMENT_STATUS_ID,
        },
        {
          paymentStatusId: FAILED_PAYMENT_STATUS_ID,
          orderStatusId: FAILED_ORDER_STATUS_ID,
        },
      );
    } else {
      this.logger.log(
        `Unhandled CoinPayments invoice status: ${invoiceStatus ?? 'unknown'}`,
      );
    }

    return { received: true };
  }

  private mapCoinPaymentsStatus(status?: string): 'paid' | 'failed' | null {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'invoicePaid':
      case 'invoiceCompleted':
        return 'paid';
      case 'cancelled':
      case 'timedOut':
      case 'invoiceCancelled':
      case 'invoiceTimedOut':
        return 'failed';
      default:
        return null;
    }
  }

  // Same fallback role as reconcilePendingOrdersWithStripe, scoped to
  // orders placed via the CoinPayments payment option.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async reconcilePendingOrdersWithCoinPayments(): Promise<void> {
    if (this.isReconcilingCoinPaymentsOrders) {
      this.logger.warn(
        'Previous CoinPayments reconciliation run is still in progress, skipping this tick',
      );
      return;
    }
    this.isReconcilingCoinPaymentsOrders = true;

    try {
      // Keep these LIKE patterns in sync with COINPAYMENTS_NAME_KEYWORDS
      // above / isCoinPaymentsOptionName.
      const pendingOrders = await this.orderRepo
        .createQueryBuilder('order')
        .leftJoin('order.paymentOption', 'paymentOption')
        .where('order.payment_status_id = :status', {
          status: PENDING_PAYMENT_STATUS_ID,
        })
        .andWhere(
          `(LOWER(paymentOption.name) LIKE '%coinpayment%'
            OR LOWER(paymentOption.name) LIKE '%coin payment%'
            OR LOWER(paymentOption.name) LIKE '%crypto%')`,
        )
        .getMany();

      const invoiceIds = [
        ...new Set(
          pendingOrders
            .map((o) => o.paymentGatewayId)
            .filter((id): id is string => !!id),
        ),
      ];

      if (!invoiceIds.length) return;

      this.logger.log(
        `Reconciling ${invoiceIds.length} pending CoinPayments invoice(s) against pending orders`,
      );

      for (const invoiceId of invoiceIds) {
        try {
          const invoiceResponse =
            await this.coinPaymentsService.getInvoice(invoiceId);
          const status = this.mapCoinPaymentsStatus(invoiceResponse?.status);
          if (status === 'paid') {
            await this.markPaidBySessionId(invoiceId);
            this.logger.log(`Invoice ${invoiceId} reconciled as paid`);
          } else if (status === 'failed') {
            const result = await this.orderRepo.update(
              {
                paymentGatewayId: invoiceId,
                paymentStatusId: PENDING_PAYMENT_STATUS_ID,
              },
              {
                paymentStatusId: FAILED_PAYMENT_STATUS_ID,
                orderStatusId: FAILED_ORDER_STATUS_ID,
              },
            );
            if (result.affected) {
              this.logger.log(`Invoice ${invoiceId} reconciled as failed`);
            }
          }
          // any other status — still genuinely pending, leave as-is
        } catch (err) {
          this.logger.error(
            `Failed to reconcile CoinPayments invoice ${invoiceId}: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }
    } finally {
      this.isReconcilingCoinPaymentsOrders = false;
    }
  }

  // Idempotent against Stripe's at-least-once webhook delivery: we snapshot
  // exactly which orders are still PENDING for this session *before* updating
  // them, and only that snapshot ever gets a queue entry / Bull job. A
  // redelivered event finds zero pending orders left (they're already PAID)
  // and does nothing on its second pass — it can never create a duplicate
  // queue row or double-credit points.
  private async markPaidBySessionId(sessionId: string) {
    try {
      const pendingOrders = await this.orderRepo.find({
        where: {
          paymentGatewayId: sessionId,
          paymentStatusId: PENDING_PAYMENT_STATUS_ID,
        },
        relations: ['product'],
      });

      if (!pendingOrders.length) return;

      const pendingIds = pendingOrders.map((o) => o.id);

      await this.orderRepo.update(
        { id: In(pendingIds) },
        {
          paymentStatusId: PAID_PAYMENT_STATUS_ID,
          orderStatusId: CONFIRMED_ORDER_STATUS_ID,
        },
      );

      await this.finalizeOrdersAsPaid(pendingOrders);
    } catch (err) {
      console.log(err);
    }
  }

  // Post-payment side effects shared by every path that lands an order in
  // PAID/CONFIRMED: the webhook/cron reconciliation path above, and the
  // "wallet covered the entire order" path in checkout() (which never
  // touches a payment gateway, so it finalizes immediately instead of
  // waiting for a webhook). Callers are responsible for having already set
  // paymentStatusId/orderStatusId — this only does cart-clear/notify/
  // point-queue/receipt-queue.
  private async finalizeOrdersAsPaid(orders: Order[]) {
    const jobs: PointDistributionPurchaseQueue[] = [];
    for (const order of orders) {
      await this.cartRepo.delete({
        buyer: { id: order.buyerId },
        product: { id: order.productId },
      });

      // best-effort — a notification failure must never block payment
      // reconciliation or point-distribution queuing
      void this.notificationsService.notifyUser({
        userId: order.buyerId,
        categoryName: NotificationCategoryName.ORDERS,
        typeName: NotificationTypeName.SUCCESS,
        heading: 'Order confirmed',
        subheading: `Your payment for order #${order.id} was successful.`,
        route: `/orders/${order.id}`,
        data: { orderId: order.id },
      });

      // Partner-available products never distribute points — skip
      // queuing this order for the points worker entirely.
      if (order.productType == "partner") {
        console.log(
          'Partner available so no points distribution for order id: ',
          order.id,
        );
        continue;
      }

      // totalPoints/remainingPoints start at 0 — the worker looks up the
      // live point_distributions rates and fills these in once it starts
      // processing (see PointDistributionQueueService.processPurchase).
      const queue = this.pointDistributionPurchaseQueueRepo.create({
        userId: order.buyerId.toString(),
        orderId: order.id.toString(),
        productId: order.productId.toString(),
        quantity: order.quantity,
        totalPoints: '0',
        remainingPoints: '0',
      });

      const savedQueue =
        await this.pointDistributionPurchaseQueueRepo.save(queue);

      jobs.push(savedQueue);
    }

    for (const job of jobs) {
      await this.pointDistributionQueue.add(
        'purchase-distribution',
        {
          queueId: job.id,
        },
        {
          attempts: 5,
          removeOnComplete: 1000,
          removeOnFail: false,
        },
      );
    }

    // Kick off receipt generation right after points distribution is
    // queued — one invoice_id per checkout, so de-dupe before starting
    // (orders passed in here normally all share one invoice_id already,
    // this just guards the general case). This writes the receipts row as
    // 'pending' and enqueues the "generate-receipt" job; the buyer can
    // already see it's in progress via GET /orders/my or the receipt
    // endpoints without having to request generation themselves.
    const invoiceIds = [
      ...new Set(
        orders
          .map((order) => order.invoiceId)
          .filter((id): id is string => !!id),
      ),
    ];
    for (const invoiceId of invoiceIds) {
      try {
        await this.receiptsService.ensureGenerationStarted(invoiceId);
      } catch (err) {
        // best-effort, same as the notification call above — a failure to
        // start receipt generation must never block payment reconciliation.
        // Notably, this call sits inside checkout()'s wallet-only path
        // too, wrapped in a try/catch that refunds the wallet and deletes
        // the order snapshot on any thrown error — rethrowing here would
        // incorrectly unwind an order that was actually paid successfully.
        this.logger.error(
          `Failed to start receipt generation for invoice ${invoiceId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  async getStatusBySessionId(buyerId: number, sessionId: string) {
    let orders = await this.orderRepo.find({
      where: { paymentGatewayId: sessionId, buyerId },
      relations: ['orderStatus', 'paymentStatus', 'product'],
    });

    // No gateway session matched — this happens for a wallet-only checkout,
    // where paymentGatewayId is never written (see checkout()'s
    // `totalPayableViaGateway <= 0` branch), so the confirm page's
    // checkout_id is the invoiceId instead. Fall back to that before
    // giving up.
    if (!orders.length) {
      orders = await this.orderRepo.find({
        where: { invoiceId: sessionId, buyerId },
        relations: ['orderStatus', 'paymentStatus', 'product'],
      });
    }

    if (!orders.length) {
      throw new NotFoundException('No orders found for this session');
    }
    return { data: orders, message: 'Order status fetched successfully' };
  }

  async findMyOrders(
    buyerId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('order.orderStatus', 'orderStatus')
      .leftJoinAndSelect('order.paymentStatus', 'paymentStatus')
      .where('order.buyer_id = :buyerId', { buyerId })
      .orderBy('order.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR order.payment_gateway_id LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    // Step 6: attach a `receipt` field per invoice group. `not_created`
    // means no receipts row exists yet for that invoice_id, distinct from
    // `pending` (a generate-receipt job is in flight) — the frontend uses
    // this alone to decide download/generate/processing/retry, so it must
    // stay accurate. Rows predating the invoice_id migration have no
    // invoice_id at all, and get `receipt: null` rather than a status.
    const invoiceIds = [
      ...new Set(
        data.map((order) => order.invoiceId).filter((id): id is string => !!id),
      ),
    ];
    const statusByInvoiceId =
      await this.receiptsService.getStatusesForInvoiceIds(invoiceIds);

    const orders = data.map((order) => ({
      ...order,
      receipt: order.invoiceId
        ? { status: statusByInvoiceId.get(order.invoiceId) ?? 'not_created' }
        : null,
    }));

    return {
      data: {
        orders,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Orders fetched successfully',
    };
  }

  async findMyOrder(buyerId: number, id: number) {
    const order = await this.orderRepo.findOne({
      where: { id, buyerId },
      relations: [
        'product',
        'orderStatus',
        'paymentStatus',
        'paymentOption',
        'buyerContactDetails',
        'orderSnapshot',
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    return { data: order, message: 'Order' };
  }

  // Buyer-scoped: only returns a snapshot that belongs to one of the
  // buyer's own orders, so an id from another buyer's order 404s instead
  // of leaking their pricing breakdown.
  async getMyOrderSnapshot(buyerId: number, id: number) {
    const order = await this.orderRepo.findOne({
      where: { orderSnapshotId: id, buyerId },
      relations: ['orderSnapshot'],
    });
    if (!order?.orderSnapshot) {
      throw new NotFoundException('Order snapshot not found');
    }
    return { data: order.orderSnapshot, message: 'Order snapshot' };
  }

  async findAll(page: number, limit: number, search?: string) {
    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.orderStatus', 'orderStatus')
      .leftJoinAndSelect('order.paymentStatus', 'paymentStatus')
      .orderBy('order.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        `(product.name LIKE :search
          OR order.payment_gateway_id LIKE :search
          OR buyer.first_name LIKE :search
          OR buyer.last_name LIKE :search
          OR buyer.email LIKE :search
          OR buyer.unique_user_id LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        orders: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Orders fetched successfully',
    };
  }

  async findOne(id: number) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'product',
        'buyer',
        'orderStatus',
        'paymentStatus',
        'paymentOption',
        'buyerContactDetails',
        'orderSnapshot',
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    return { data: order, message: 'Order' };
  }

  // Admin: unrestricted lookup, unlike getMyOrderSnapshot.
  async getOrderSnapshot(id: number) {
    const snapshot = await this.orderSnapshotRepo.findOne({ where: { id } });
    if (!snapshot) throw new NotFoundException('Order snapshot not found');
    return { data: snapshot, message: 'Order snapshot' };
  }

  async updateStatus(id: number, dto: AdminUpdateOrderDto) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const orderStatusChanged =
      dto.orderStatusId !== undefined &&
      dto.orderStatusId !== order.orderStatusId;

    if (dto.orderStatusId !== undefined)
      order.orderStatusId = dto.orderStatusId;
    if (dto.paymentStatusId !== undefined)
      order.paymentStatusId = dto.paymentStatusId;

    await this.orderRepo.save(order);

    if (orderStatusChanged) {
      const updated = await this.orderRepo.findOne({
        where: { id },
        relations: ['orderStatus'],
      });
      void this.notificationsService.notifyUser({
        userId: order.buyerId,
        categoryName: NotificationCategoryName.ORDERS,
        typeName: NotificationTypeName.GENERAL,
        heading: 'Order status updated',
        subheading: `Your order #${order.id} is now "${updated?.orderStatus?.name ?? 'updated'}".`,
        route: `/orders/${order.id}`,
        data: { orderId: order.id, orderStatusId: order.orderStatusId },
      });
    }

    return { data: order, message: 'Order updated successfully' };
  }
}
