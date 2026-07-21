import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Admin } from './admin.entity';
import { PointDistribution } from './point-distribution.entity';
import { PointPool } from './point-pool.entity';
import { Order } from './order.entity';

export enum PointWalletType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  POOL = 'POOL',
}

export enum PointTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum PointTransactionReason {
  BUY_PRODUCT = 'BUY_PRODUCT',
  SELL_PRODUCT = 'SELL_PRODUCT',
  PURCHASE_REWARD = 'PURCHASE_REWARD',
  REFERRAL_LEVEL_1 = 'REFERRAL_LEVEL_1',
  REFERRAL_LEVEL_2 = 'REFERRAL_LEVEL_2',
  POOL_CONTRIBUTION = 'POOL_CONTRIBUTION',
  POOL_DISTRIBUTION = 'POOL_DISTRIBUTION',
  PRODUCT_PURCHASE = 'PRODUCT_PURCHASE',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
  EXPIRE = 'EXPIRE',
  OTHER = 'OTHER',
}

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'wallet_type', type: 'enum', enum: PointWalletType })
  walletType: PointWalletType;

  @Column({ name: 'wallet_id', type: 'bigint' })
  walletId: number;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: PointTransactionType,
  })
  transactionType: PointTransactionType;

  @Column({
    name: 'transaction_reason',
    type: 'enum',
    enum: PointTransactionReason,
  })
  transactionReason: PointTransactionReason;

  @Column({ name: 'source_user_id', type: 'bigint', nullable: true })
  sourceUserId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'source_user_id' })
  sourceUser: User;

  @Column({ name: 'source_admin_id', type: 'bigint', nullable: true })
  sourceAdminId: number | null;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'source_admin_id' })
  sourceAdmin: Admin;

  @Column({ name: 'receiver_user_id', type: 'bigint', nullable: true })
  receiverUserId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiver_user_id' })
  receiverUser: User;

  @Column({ name: 'receiver_admin_id', type: 'bigint', nullable: true })
  receiverAdminId: number | null;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'receiver_admin_id' })
  receiverAdmin: Admin;


  // no DB-level FK on product_id per the DDL — kept as a plain reference
  // column rather than a TypeORM relation
  @Column({ name: 'product_id', type: 'bigint', nullable: true })
  productId: number | null;

  // order_id also has no DB-level FK constraint, but a TypeORM relation can
  // still join on it without one — used to surface order context (amount,
  // status) in the "my transactions" feed rather than just the bare id.
  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId: number | null;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'point_distribution_id', type: 'bigint', nullable: true })
  pointDistributionId: number | null;

  @ManyToOne(() => PointDistribution)
  @JoinColumn({ name: 'point_distribution_id' })
  pointDistribution: PointDistribution;

  @Column({ name: 'pool_id', type: 'bigint', nullable: true })
  poolId: number | null;

  @ManyToOne(() => PointPool)
  @JoinColumn({ name: 'pool_id' })
  pool: PointPool;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
