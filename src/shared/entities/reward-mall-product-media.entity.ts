import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RewardMallProduct } from './reward-mall-product.entity';

export enum RewardMallProductMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('reward_mall_product_media')
export class RewardMallProductMedia {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'reward_mall_product_id', type: 'bigint' })
  rewardMallProductId: number;

  @ManyToOne(() => RewardMallProduct, (product) => product.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reward_mall_product_id' })
  product: RewardMallProduct;

  @Column({ name: 'media_url', type: 'varchar', length: 500 })
  mediaUrl: string;

  @Column({
    name: 'media_type',
    type: 'enum',
    enum: RewardMallProductMediaType,
    default: RewardMallProductMediaType.IMAGE,
  })
  mediaType: RewardMallProductMediaType;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
