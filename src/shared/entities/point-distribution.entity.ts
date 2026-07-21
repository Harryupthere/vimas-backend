import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PointEventType {
  BUY_PRODUCT = 'BUY_PRODUCT',
  SELL_PRODUCT = 'SELL_PRODUCT',
  REFERRAL = 'REFERRAL',
  POOL_DISTRIBUTION = 'POOL_DISTRIBUTION',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
  OTHER = 'OTHER',
}

export enum PointReceiverType {
  BUYER = 'BUYER',
  MERCHANT = 'MERCHANT',
  UPLINE_LEVEL_1 = 'UPLINE_LEVEL_1',
  UPLINE_LEVEL_2 = 'UPLINE_LEVEL_2',
  POOL = 'POOL',
  ADMIN = 'ADMIN',
}

export enum PointDistributionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('point_distributions')
export class PointDistribution {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  symbol: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  colour: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: PointEventType,
  })
  eventType: PointEventType;

  @Column({
    name: 'receiver_type',
    type: 'enum',
    enum: PointReceiverType,
  })
  receiverType: PointReceiverType;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  points: number;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({
    type: 'enum',
    enum: PointDistributionStatus,
    default: PointDistributionStatus.ACTIVE,
  })
  status: PointDistributionStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
