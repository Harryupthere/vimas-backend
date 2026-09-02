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
import { OrderSnapshot } from './order-snapshot.entity';
// Imported directly from the leaf enum file, not from cart.entity.ts — see
// cart-type.enum.ts for why (avoids the cart/user/order require cycle that
// was corrupting this column's metadata).
import { CartType } from '../enums/cart-type.enum';
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    name: 'order_snapshot_id',
    type: 'bigint',
    nullable: true,
  })
  orderSnapshotId: number | null;

  @ManyToOne(() => OrderSnapshot, (orderSnapshot) => orderSnapshot.orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_snapshot_id' })
  orderSnapshot: OrderSnapshot | null;

  // Shared by every row from the same checkout (assigned in
  // OrdersService.checkout, keyed off order_snapshot_id — not
  // payment_gateway_id, which isn't set at this point and stays NULL
  // forever for a wallet-only checkout). Indexed but not unique at the DB
  // level; relates to `receipts.invoice_id` at the application level only.
  @Column({
    name: 'invoice_id',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  invoiceId: string | null;

  @Column({
    name: 'product_type',
    type: 'enum',
    enum: CartType,
    default: CartType.CONSUMER,
  })
  productType: CartType;

  @Column({ name: 'buyer_id', type: 'bigint' })
  buyerId: number;

  @ManyToOne(() => User, (user) => user.ordersAsBuyer)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  // No merchant_id column — admin is the sole product owner now, so an
  // order has no separate merchant to attribute (the buyer and the
  // product are the only parties involved).

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
