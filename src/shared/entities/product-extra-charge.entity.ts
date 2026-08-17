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

export enum ChargeCalculationBasis {
  QUANTITY = 'QUANTITY',
  PRODUCT = 'PRODUCT',
}

export enum ChargeCalculationType {
  PERCENTAGE = 'PERCENTAGE',
  AMOUNT = 'AMOUNT',
}

// Admin-configured additional charges (shipping, processing, platform fee,
// ...) for a product, scoped by product_type — e.g. Product A / CONSUMER /
// "Processing Fee" = 5% + 1 MYR. See CheckoutPricingService for how these
// are actually calculated at checkout.
@Entity('product_extra_charges')
export class ProductExtraCharge {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.extraCharges, {
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

  // Whether the charge is calculated per quantity or per product
  @Column({
    name: 'calculation_basis',
    type: 'enum',
    enum: ChargeCalculationBasis,
    default: ChargeCalculationBasis.PRODUCT,
  })
  calculationBasis: ChargeCalculationBasis;

  // Whether the primary charge is percentage-based or fixed amount
  @Column({
    name: 'calculation_type',
    type: 'enum',
    enum: ChargeCalculationType,
    default: ChargeCalculationType.AMOUNT,
  })
  calculationType: ChargeCalculationType;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({
    name: 'fixed_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  fixedAmount: number;

  // Whether the fixed amount is applied per quantity or per product
  @Column({
    name: 'fixed_amount_basis',
    type: 'enum',
    enum: ChargeCalculationBasis,
    nullable: true,
  })
  fixedAmountBasis: ChargeCalculationBasis | null;

  // Charge is waived when quantity reaches this value
  @Column({
    name: 'waive_at_quantity',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  waiveAtQuantity: number | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
