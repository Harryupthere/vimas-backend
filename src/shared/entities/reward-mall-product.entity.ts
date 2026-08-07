import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RewardMallCategory } from './reward-mall-category.entity';
import { RewardMallProductMedia } from './reward-mall-product-media.entity';

@Entity('reward_mall_products')
export class RewardMallProduct {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'category_id', type: 'bigint' })
  categoryId: number;

  @ManyToOne(() => RewardMallCategory, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: RewardMallCategory;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'sub_title', type: 'varchar', length: 255, nullable: true })
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

  // Cost of one unit, in reward points
  @Column({
    name: 'point_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  pointPrice: number;

  @Column({ name: 'minimum_quantity', type: 'int', unsigned: true, default: 1 })
  minimumQuantity: number;

  @Column({ name: 'maximum_quantity', type: 'int', unsigned: true, default: 1 })
  maximumQuantity: number;

  @Column({ name: 'stock_show', type: 'tinyint', width: 1, default: 0 })
  stockShow: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number;

  @Column({ name: 'is_out_of_stock', type: 'tinyint', width: 1, default: 0 })
  isOutOfStock: number;

  @Column({ name: 'label_show', type: 'tinyint', width: 1, default: 0 })
  labelShow: number;

  @Column({ name: 'label_text', type: 'varchar', length: 100, nullable: true })
  labelText: string;

  @Column({ name: 'label_color', type: 'varchar', length: 50, nullable: true })
  labelColor: string;

  @Column({ name: 'view_count', type: 'int', unsigned: true, default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', type: 'int', unsigned: true, default: 0 })
  likeCount: number;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  // 0=inactive, 1=active
  @Column({ type: 'tinyint', width: 1, default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RewardMallProductMedia, (media) => media.product, {
    cascade: true,
  })
  media: RewardMallProductMedia[];
}
