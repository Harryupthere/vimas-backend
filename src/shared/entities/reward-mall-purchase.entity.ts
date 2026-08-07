import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { RewardMallProduct } from './reward-mall-product.entity';
import { RewardMallPurchaseStatus } from './reward-mall-purchase-status.entity';

@Entity('reward_mall_purchase')
export class RewardMallPurchase {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'reward_mall_product_id', type: 'bigint' })
  rewardMallProductId: number;

  @ManyToOne(() => RewardMallProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reward_mall_product_id' })
  product: RewardMallProduct;

  @Column({ type: 'int', unsigned: true, default: 1 })
  quantity: number;

  // Total points spent — product.pointPrice * quantity at time of purchase
  @Column({
    name: 'points_redeemed',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  pointsRedeemed: number;

  @Column({ name: 'status_id', type: 'bigint' })
  statusId: number;

  @ManyToOne(() => RewardMallPurchaseStatus, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'status_id' })
  status: RewardMallPurchaseStatus;

  @Column({
    name: 'tracking_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  trackingNumber: string | null;

  @Column({ name: 'admin_remark', type: 'json', nullable: true })
  adminRemark: string[] | null;

  @Column({ name: 'user_remark', type: 'json', nullable: true })
  userRemark: string[] | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
