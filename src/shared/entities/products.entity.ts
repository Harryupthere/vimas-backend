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
import { User } from './user.entity';
import { ProductMedia } from './product-media.entity';
import { ProductAction } from './product-action.entity';
import { ProductPaymentOption } from './product-payment-option.entity';
import { Cart } from './cart.entity';
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

  @Column({ name: 'stock_show', type: 'tinyint', default: 0 })
  stockShow: number;

  @Column({ name: 'stock', type: 'int', default: 0 })
  stock: number;

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

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'status', type: 'tinyint', default: 0 })
  status: number;

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

  @ManyToOne(() => User, (user) => user.products)
  @JoinColumn({ name: 'merchant_id' })
  merchant: User;

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
}
