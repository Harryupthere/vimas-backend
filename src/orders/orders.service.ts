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
import Stripe from 'stripe';
import { Order } from '../shared/entities/order.entity';
import { Cart } from '../shared/entities/cart.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { StripeService } from '../stripe/stripe.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AdminUpdateOrderDto } from './dto/admin-update-order.dto';
import { PointDistributionPurchaseQueue } from '../shared/entities/point-distribution-purchase-queue.entity';
const PENDING_PAYMENT_STATUS_ID = 1;
const PAID_PAYMENT_STATUS_ID = 2;
const FAILED_PAYMENT_STATUS_ID = 3;
const CONFIRMED_ORDER_STATUS_ID = 2;
const FAILED_ORDER_STATUS_ID = 5;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // guards against a slow Stripe round-trip still being in flight when the
  // next scheduled tick fires
  private isReconcilingPendingOrders = false;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,

    @InjectRepository(PointDistributionPurchaseQueue)
    private readonly pointDistributionPurchaseQueueRepo: Repository<PointDistributionPurchaseQueue>,

    @InjectQueue('point-distribution')
    private readonly pointDistributionQueue: Queue,

    private readonly stripeService: StripeService,
  ) {}

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

    const orders: Order[] = cartItems.map((item) => {
      const unitPrice = Number(item.price_snapshot);
      const discount = Number(item.discount_snapshot || 0);
      const total = item.quantity * (unitPrice - discount);
      if(item.quantity>9 && item.cart_type=='consumer'){
      throw new NotFoundException('Consumer can only order 9 quantity of product. Please buy the product from Reseller page.');
      }

      return this.orderRepo.create({
        buyerId,
        productId: item.product.id,
        buyerContactDetailsId: contactInfo.id,
        paymentOptionId: dto.paymentOptionId ?? 1,
        quantity: item.quantity,
        singleUnitPrice: unitPrice,
        discountAmount: discount,
        totalAmount: total,
        totalAmountPaid: total,
      });
    });

    const savedOrders = await this.orderRepo.save(orders);
    const orderIds = savedOrders.map((o) => o.id);

    let session: Stripe.Checkout.Session;
    try {
      const currency = process.env.STRIPE_CURRENCY || 'myr';
      const appUrl = process.env.APP_URL || '';

      session = await this.stripeService.createCheckoutSession({
        mode: 'payment',
        line_items: savedOrders.map((order, idx) => ({
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
        })),
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

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    console.log('===================== WEBHOOK =============');

    const event = this.stripeService.constructEvent(rawBody, signature);
    console.log(event.type);
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.markPaidBySessionId(session.id);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
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
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
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
    console.log("Fecthing pending orders")
    if (this.isReconcilingPendingOrders) {
      this.logger.warn(
        'Previous pending-orders reconciliation run is still in progress, skipping this tick',
      );
      return;
    }
    this.isReconcilingPendingOrders = true;

    try {
      const pendingOrders = await this.orderRepo.find({
        where: { paymentStatusId: PENDING_PAYMENT_STATUS_ID },
      });

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
    console.log( `Reconciling ${sessionIds.length} pending Stripe session(s) against pending orders`)

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

  async findMyOrders(buyerId: number, page: number, limit: number) {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { buyerId },
      relations: ['product', 'orderStatus', 'paymentStatus'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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

  async findAll(page: number, limit: number) {
    const [data, total] = await this.orderRepo.findAndCount({
      relations: ['product', 'buyer', 'orderStatus', 'paymentStatus'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    

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

    if (dto.orderStatusId !== undefined)
      order.orderStatusId = dto.orderStatusId;
    if (dto.paymentStatusId !== undefined)
      order.paymentStatusId = dto.paymentStatusId;

    await this.orderRepo.save(order);
    return { data: order, message: 'Order updated successfully' };
  }
}
