import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './products.entity';
import { ContactInfo } from './contact-info.entity';
import { PaymentOption } from './payment-option.entity';
import { PaymentStatus } from './payment-status.entity';
import { OrderStatus } from './order-status.entity';
import { PointDistributionPurchaseQueue } from './point-distribution-purchase-queue.entity';
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'buyer_id', type: 'bigint' })
  buyerId: number;

  @ManyToOne(() => User, (user) => user.ordersAsBuyer)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId: number;

  @ManyToOne(() => User, (user) => user.ordersAsMerchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: User;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.orders)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'buyer_contact_details_id', type: 'bigint' })
  buyerContactDetailsId: number;

  @ManyToOne(() => ContactInfo)
  @JoinColumn({ name: 'buyer_contact_details_id' })
  buyerContactDetails: ContactInfo;

  @Column({ name: 'payment_option_id', type: 'bigint', default: 1 })
  paymentOptionId: number;

  @ManyToOne(() => PaymentOption)
  @JoinColumn({ name: 'payment_option_id' })
  paymentOption: PaymentOption;

  @Column({ name: 'payment_status_id', type: 'bigint', default: 1 })
  paymentStatusId: number;

  @ManyToOne(() => PaymentStatus, (paymentStatus) => paymentStatus.orders)
  @JoinColumn({ name: 'payment_status_id' })
  paymentStatus: PaymentStatus;

  @Column({ name: 'order_status_id', type: 'bigint', default: 1 })
  orderStatusId: number;

  @ManyToOne(() => OrderStatus, (orderStatus) => orderStatus.orders)
  @JoinColumn({ name: 'order_status_id' })
  orderStatus: OrderStatus;

  @Column({ name: 'payment_gateway_id', type: 'text', nullable: true })
  paymentGatewayId: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    name: 'single_unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  singleUnitPrice: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ name: 'addon_amount', type: 'json', nullable: true })
  addonAmount: Record<string, any> | null;

  @Column({ name: 'addon_amount_details', type: 'json', nullable: true })
  addonAmountDetails: Record<string, any> | null;

  @Column({ name: 'coupon_amount', type: 'json', nullable: true })
  couponAmount: Record<string, any> | null;

  @Column({ name: 'coupon_amount_details', type: 'json', nullable: true })
  couponAmountDetails: Record<string, any> | null;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    name: 'total_amount_paid',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalAmountPaid: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'last_update' })
  lastUpdate: Date;

  @OneToOne(() => PointDistributionPurchaseQueue, (queue) => queue.order)
  pointDistributionQueue: PointDistributionPurchaseQueue;
}
