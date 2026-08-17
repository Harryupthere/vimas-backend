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

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  AMOUNT = 'AMOUNT',
}

// Admin-configured automatic discounts for a product, scoped by
// product_type — applied by the backend without any buyer input (unlike
// product_coupons, which require a code). See CheckoutPricingService for
// eligibility + calculation.
@Entity('product_discounts')
export class ProductDiscount {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.discounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

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
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
  })
  discountType: DiscountType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  // Minimum quantity required for discount
  @Column({
    name: 'minimum_quantity',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  minimumQuantity: number | null;

  // Maximum discount allowed for percentage discount
  @Column({
    name: 'maximum_discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  maximumDiscountAmount: number | null;

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
