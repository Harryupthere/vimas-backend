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

export enum AddOnCalculationType {
  PERCENTAGE = 'PERCENTAGE',
  AMOUNT = 'AMOUNT',
}

// Admin-configured optional add-ons for a product, scoped by product_type —
// e.g. Product A / CONSUMER / "Gift Packaging" = 5 MYR per unit. Buyers opt
// in explicitly at checkout (never auto-applied); see
// CheckoutPricingService for eligibility + amount calculation.
@Entity('product_add_ons')
export class ProductAddOn {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.addOns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  symbol: string | null;

  @Column({
    name: 'product_type',
    type: 'enum',
    enum: ProductType,
    default: ProductType.CONSUMER,
  })
  productType: ProductType;

  // Whether the add-on price is percentage-based or fixed amount
  @Column({
    name: 'calculation_type',
    type: 'enum',
    enum: AddOnCalculationType,
    default: AddOnCalculationType.AMOUNT,
  })
  calculationType: AddOnCalculationType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  // 0 = applied once, 1 = applied for each quantity
  @Column({ name: 'cost_per_unit', type: 'tinyint', width: 1, default: 0 })
  costPerUnit: number;

  // Minimum product quantity required for this add-on
  @Column({
    name: 'applicable_minimum_quantity',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  applicableMinimumQuantity: number | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
