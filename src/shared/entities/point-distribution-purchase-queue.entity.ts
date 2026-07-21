import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Order } from './order.entity';
import { Product } from './products.entity';

export enum PointDistributionPurchaseQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
// Values must match the live `stage` ENUM exactly (verified against the DB:
// enum('created','buyer_reward','level1_reward','level2_reward','pool_reward','completed')).
// BUY_REWARD was previously 'buyer', which isn't one of the column's allowed
// values — MySQL strict mode rejects it with "Data truncated for column
// 'stage'" on the very first stage advance after crediting the buyer.
export enum PointDistributionPurchaseQueueStage {
  CREATED = 'created',
  BUY_REWARD = 'buyer_reward',
  UPLINE_LEVEL_1 = 'level1_reward',
  UPLINE_LEVEL_2 = 'level2_reward',
  POOL_REWARD = 'pool_reward',
  COMPLETED = 'completed',
}

@Entity('point_distribution_purchase_queue')
export class PointDistributionPurchaseQueue {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true, unique: true })
  orderId: string;

  @OneToOne(() => Order, (order) => order.pointDistributionQueue)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // Not unique: the same product is purchased many times, each purchase
  // gets its own queue entry (unlike order_id, which is genuinely 1:1).
  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  productId: string;

  @ManyToOne(() => Product, (product) => product.pointDistributionQueues)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  quantity: number;

  // Filled in by the worker (PointDistributionQueueService) once it looks up
  // the live point_distributions rates — not a fixed per-purchase constant.
  @Column({
    name: 'total_points',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  totalPoints: string;

  @Column({
    name: 'remaining_points',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  remainingPoints: string;

  @Column({
    type: 'enum',
    enum: PointDistributionPurchaseQueueStatus,
    default: 'pending',
  })
  status: PointDistributionPurchaseQueueStatus;

  @Column({
    type: 'enum',
    enum: PointDistributionPurchaseQueueStage,
    default: 'created',
  })
  stage: PointDistributionPurchaseQueueStage;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({
    name: 'last_attempt_at',
    type: 'datetime',
    nullable: true,
  })
  lastAttemptAt: Date;

  @Column({
    name: 'processed_at',
    type: 'datetime',
    nullable: true,
  })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  
}
