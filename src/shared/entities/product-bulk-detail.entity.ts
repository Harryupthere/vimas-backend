import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Product } from './products.entity';

@Entity('product_bulk_details')
@Unique(['productId', 'packageQuantity'])
export class ProductBulkDetail {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Index()
  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'package_quantity',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  packageQuantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  unitPrice: number;

  @Column({
    name: 'discount_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercentage: number;

  @Column({ name: 'free_quantity', type: 'int', unsigned: true, default: 0 })
  freeQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fees: number;

  @Column({
    name: 'shipping_charges',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingCharges: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalPrice: number;

  @Column({
    name: 'total_points',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalPoints: number;

  // Buyer-facing visibility flags for this specific package — mirrors
  // products.show_total_points/show_points_sharing but defaults to visible
  // (1) rather than hidden, unlike the product-level columns.
  @Column({ name: 'show_total_points', type: 'tinyint', width: 1, default: 1 })
  showTotalPoints: number;

  @Column({
    name: 'show_points_sharing',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  showPointsSharing: number;

  @Index()
  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
