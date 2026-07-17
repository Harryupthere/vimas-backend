import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order } from '../shared/entities/order.entity';
import { Cart } from '../shared/entities/cart.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { StripeService } from '../stripe/stripe.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminUpdateOrderDto } from './dto/admin-update-order.dto';

const PENDING_PAYMENT_STATUS_ID = 1;
const PAID_PAYMENT_STATUS_ID = 2;
const FAILED_PAYMENT_STATUS_ID = 3;
const CONFIRMED_ORDER_STATUS_ID = 2;
const FAILED_ORDER_STATUS_ID = 5;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,

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

      return this.orderRepo.create({
        buyerId,
        merchantId: item.product.merchantId,
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
        success_url: `${appUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}?checkout=cancel`,
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
    const event = this.stripeService.constructEvent(rawBody, signature);

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

  private async markPaidBySessionId(sessionId: string) {
    const result = await this.orderRepo.update(
      {
        paymentGatewayId: sessionId,
        paymentStatusId: PENDING_PAYMENT_STATUS_ID,
      },
      {
        paymentStatusId: PAID_PAYMENT_STATUS_ID,
        orderStatusId: CONFIRMED_ORDER_STATUS_ID,
      },
    );

    if (!result.affected) return;

    const paidOrders = await this.orderRepo.find({
      where: { paymentGatewayId: sessionId },
    });

    for (const order of paidOrders) {
      await this.cartRepo.delete({
        buyer: { id: order.buyerId },
        product: { id: order.productId },
      });
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

  async findMerchantOrders(merchantId: number, page: number, limit: number) {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { merchantId },
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

  async updateOrderStatus(
    merchantId: number,
    id: number,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (Number(order.merchantId) !== Number(merchantId)) {
      throw new ForbiddenException('You are not the merchant for this order');
    }

    order.orderStatusId = dto.orderStatusId;
    await this.orderRepo.save(order);
    return { data: order, message: 'Order status updated successfully' };
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await this.orderRepo.findAndCount({
      relations: ['product', 'buyer', 'merchant', 'orderStatus', 'paymentStatus'],
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
        'merchant',
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

    if (dto.orderStatusId !== undefined) order.orderStatusId = dto.orderStatusId;
    if (dto.paymentStatusId !== undefined)
      order.paymentStatusId = dto.paymentStatusId;

    await this.orderRepo.save(order);
    return { data: order, message: 'Order updated successfully' };
  }
}
