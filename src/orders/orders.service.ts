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
import { Cart } from '../shared/entities/cart.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { CryptoCurrency } from '../shared/entities/crypto-currency.entity';
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

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,

    @InjectRepository(PaymentOption)
    private readonly paymentOptionRepo: Repository<PaymentOption>,

    @InjectRepository(CryptoCurrency)
    private readonly cryptoCurrencyRepo: Repository<CryptoCurrency>,

    @InjectRepository(PointDistributionPurchaseQueue)
    private readonly pointDistributionPurchaseQueueRepo: Repository<PointDistributionPurchaseQueue>,

    @InjectQueue('point-distribution')
    private readonly pointDistributionQueue: Queue,

    private readonly stripeService: StripeService,
    private readonly coinPaymentsService: CoinPaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private isCoinPaymentsOptionName(name?: string | null): boolean {
    const normalized = (name ?? '').toLowerCase();
    return COINPAYMENTS_NAME_KEYWORDS.some((keyword) =>
      normalized.includes(keyword),
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
    // on this payment_options row. Per-order totalAmount/totalAmountPaid
    // deliberately stay pure product cost — the fee isn't tied to any one
    // product, so it's kept out of the order rows entirely rather than
    // folded into one of them (which would risk double-counting wherever
    // totalAmountPaid is summed elsewhere).
    const paymentCharges = Number(paymentOption.charges) || 0;

    const orders: Order[] = cartItems.map((item) => {
      const unitPrice = Number(item.price_snapshot);
      const discount = Number(item.discount_snapshot || 0);
      const total = item.quantity * (unitPrice - discount);
      if (item.quantity > 9 && item.cart_type == 'consumer') {
        throw new NotFoundException(
          'Consumer can only order 9 quantity of product. Please buy the product from Reseller page.',
        );
      }

      return this.orderRepo.create({
        buyerId,
        productId: item.product.id,
        buyerContactDetailsId: contactInfo.id,
        paymentOptionId,
        quantity: item.quantity,
        singleUnitPrice: unitPrice,
        discountAmount: discount,
        totalAmount: total,
        totalAmountPaid: total,
      });
    });

    const savedOrders = await this.orderRepo.save(orders);
    const orderIds = savedOrders.map((o) => o.id);

    const isCoinPayments = this.isCoinPaymentsOptionName(paymentOption.name);

    if (isCoinPayments) {
      return this.createCoinPaymentsCheckout(
        dto,
        cartItems,
        savedOrders,
        orderIds,
        paymentCharges,
      );
    }

    return this.createStripeCheckout(
      cartItems,
      savedOrders,
      orderIds,
      paymentCharges,
    );
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
            unit_amount: Math.round(
              (Number(order.singleUnitPrice) - Number(order.discountAmount)) *
                100,
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
        success_url: `${appUrl}order-confirmation?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}order-confirmation?checkout=cancel`,
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
      successUrl: `${appUrl}order-confirmation?checkout=success&session_id=${invoiceId}`,
      cancelUrl: `${appUrl}order-confirmation?checkout=cancel`,
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
    console.log(event.type);
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

      const jobs: PointDistributionPurchaseQueue[] = [];
      for (const order of pendingOrders) {
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
    } catch (err) {
      console.log(err);
    }
  }

  async getStatusBySessionId(buyerId: number, sessionId: string) {
    const orders = await this.orderRepo.find({
      where: { paymentGatewayId: sessionId, buyerId },
      relations: ['orderStatus', 'paymentStatus', 'product'],
    });
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

  async findMyOrder(buyerId: number, id: number) {
    const order = await this.orderRepo.findOne({
      where: { id, buyerId },
      relations: [
        'product',
        'orderStatus',
        'paymentStatus',
        'paymentOption',
        'buyerContactDetails',
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    return { data: order, message: 'Order' };
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
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    return { data: order, message: 'Order' };
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
