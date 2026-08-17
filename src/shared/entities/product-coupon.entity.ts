import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './products.entity';
import { ProductType } from '../enums/product-type.enum';

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  AMOUNT = 'AMOUNT',
}

// Admin-configured coupons for a product, scoped by product_type. Buyers
// apply a coupon by code at checkout — CheckoutPricingService verifies it
// belongs to a product actually in the cart, matches that item's product
// type, is active/within its validity window, and meets minimum_quantity
// before calculating the discount server-side.
@Entity('product_coupons')
export class ProductCoupon {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.coupons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({
    name: 'product_type',
    type: 'enum',
    enum: ProductType,
    default: ProductType.CONSUMER,
  })
  productType: ProductType;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: CouponDiscountType,
    default: CouponDiscountType.PERCENTAGE,
  })
  discountType: CouponDiscountType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  // Minimum product quantity required to use the coupon
  @Column({
    name: 'minimum_quantity',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  minimumQuantity: number | null;

  // Maximum discount allowed when discount type is percentage
  @Column({
    name: 'maximum_discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  maximumDiscountAmount: number | null;

  // Maximum number of times this coupon can be used
  @Column({
    name: 'usage_limit',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  usageLimit: number | null;

  @Column({ name: 'start_at', type: 'datetime', nullable: true })
  startAt: Date | null;

  @Column({ name: 'end_at', type: 'datetime', nullable: true })
  endAt: Date | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
