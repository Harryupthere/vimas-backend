import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Category } from './categories.entity';
import { Brand } from './brand.entity';
import { ProductMedia } from './product-media.entity';
import { ProductAction } from './product-action.entity';
import { ProductPaymentOption } from './product-payment-option.entity';
import { Cart } from './cart.entity';
import { Order } from './order.entity';
import { ReviewRating } from './review-rating.entity';
import { ProductHistory } from './product-history.entity';
import { PointDistributionPurchaseQueue } from './point-distribution-purchase-queue.entity';
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'sub_title', length: 255, nullable: true })
  subTitle: string;

  @Column({ type: 'longtext', nullable: true })
  description: string;

  @Column({ type: 'longtext', nullable: true })
  information: string;

  @Column({ type: 'longtext', nullable: true })
  notes: string;

  @Column({ name: 'key_points', type: 'json', nullable: true })
  keyPoints: string[];

  @Column({ type: 'json', nullable: true })
  details: Record<string, any>[];

  @Column({ name: 'search_keywords', type: 'json', nullable: true })
  searchKeywords: string[];

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2 })
  sellingPrice: number;

  @Column({ name: 'discount_available', type: 'tinyint', default: 0 })
  discountAvailable: number; // <-- notice camelCase in entity

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountAmount: number;

  @Column({
    name: 'discount_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercentage: number;

  // Total points (per unit) this product carries — the pool that gets
  // split across buyer/upline/pool via each PointDistribution rule's
  // points_percentage when the product is purchased.
  @Column({
    name: 'total_points',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalPoints: number;

  // Per-cart-type order quantity bounds — enforced in CartService.addToCart
  // against the cart line's quantity, based on the request's cart_type.
  @Column({
    name: 'consumer_minimum_quantity',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  consumerMinimumQuantity: number;

  @Column({
    name: 'consumer_maximum_quantity',
    type: 'int',
    unsigned: true,
    default: 9,
  })
  consumerMaximumQuantity: number;

  @Column({
    name: 'reseller_minimum_quantity',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  resellerMinimumQuantity: number;

  @Column({
    name: 'reseller_maximum_quantity',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  resellerMaximumQuantity: number;

  // Buyer-facing visibility flags — whether the product page should show
  // totalPoints, and whether it should show the per-receiver breakdown of
  // how those points get shared.
  @Column({ name: 'show_total_points', type: 'tinyint', default: 0 })
  showTotalPoints: number;

  @Column({ name: 'show_points_sharing', type: 'tinyint', default: 0 })
  showPointsSharing: number;

  @Column({ name: 'stock_show', type: 'tinyint', default: 0 })
  stockShow: number;

  @Column({ name: 'stock', type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'is_out_of_stock', type: 'int', default: 0 })
  isOutOfStock: number;

  @Column({ name: 'label_show', type: 'tinyint', default: 0 })
  labelShow: number;

  @Column({ name: 'label_text', length: 100, nullable: true })
  labelText: string;

  @Column({ name: 'label_color', length: 50, nullable: true })
  labelColor: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'brand_id', nullable: true })
  brandId: number;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'status', type: 'tinyint', default: 0 })
  status: number;

  // Gates the reseller product listing — GET /products?type=reseller only
  // returns products where this is 1 (see ProductsService.findAllProductsUsers).
  @Column({ name: 'bulk_available', type: 'tinyint', default: 0 })
  bulkAvailable: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  // Admin is now the sole product creator/owner (no merchant-type users) —
  // products has no merchant_id column anymore.

  @OneToMany(() => ProductMedia, (media) => media.product, {
    cascade: true,
  })
  productMedia: ProductMedia[];

  // product.entity.ts
  @OneToMany(() => ProductAction, (pa) => pa.product)
  productActions: ProductAction[];

  @OneToMany(() => ProductPaymentOption, (ppo) => ppo.product, {
    cascade: true,
  })
  paymentOptions: ProductPaymentOption[];

  // product.entity.ts
  @OneToMany(() => Cart, (cart) => cart.product)
  cartItems: Cart[];

  @OneToMany(() => Order, (order) => order.product)
  orders: Order[];

  @OneToMany(() => ReviewRating, (review) => review.product)
  reviews: ReviewRating[];

  @OneToMany(() => ProductHistory, (history) => history.product)
  history: ProductHistory[];

  @OneToMany(() => PointDistributionPurchaseQueue, (queue) => queue.product)
  pointDistributionQueues: PointDistributionPurchaseQueue[];
}
