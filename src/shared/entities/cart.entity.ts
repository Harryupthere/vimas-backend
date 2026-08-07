import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './products.entity';
import { ProductBulkDetail } from './product-bulk-detail.entity';

export enum CartType {
  CONSUMER = 'consumer',
  RESELLER = 'reseller',
}

@Entity('cart')
// A buyer can hold one consumer row AND, separately, one reseller row per
// distinct bulk package for the same product — cart_type and
// productBulkDetailsId are both part of the row's identity, not just
// attributes. NB: the DB enforces this via a generated column
// (product_bulk_details_key = COALESCE(product_bulk_details_id, 0), added
// by raw SQL, not a TypeORM migration) rather than this exact tuple,
// because MySQL treats every NULL in a unique index as distinct — without
// that substitution, consumer rows (which always have a null bulk detail)
// wouldn't dedupe correctly. This decorator is documentation only
// (synchronize is off), not what's actually running.
@Unique(['buyer', 'product', 'cart_type', 'productBulkDetailsId'])
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  quantity: number;

  @Column({ type: 'enum', enum: CartType, default: CartType.CONSUMER })
  cart_type: CartType;

  // Which bulk package (product_bulk_details) this row is for — only set
  // for reseller rows; null for consumer rows.
  @Column({
    name: 'product_bulk_details_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  productBulkDetailsId: number | null;

  @ManyToOne(() => ProductBulkDetail, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_bulk_details_id' })
  productBulkDetails: ProductBulkDetail | null;

  @Column('decimal', { precision: 10, scale: 2 })
  price_snapshot: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount_snapshot: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
