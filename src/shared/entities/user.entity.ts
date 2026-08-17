import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserType } from './user_types.entity';
import { MembershipType } from './membership-type.entity';
import { RegistrationType } from './registration_types.entity';
import { UserSession } from './user_session.entity';
import { UserSessionStorage } from './user_session_storage.entity';
import { ContactInfo } from './contact-info.entity';
import { Order } from './order.entity';
import { PointUserBalance } from './point-user-balance.entity';
import { PointDistributionPurchaseQueue } from './point-distribution-purchase-queue.entity';
import { VimasEWalletTransaction } from './vimas-e-wallet-transaction.entity';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: false })
  unique_user_id: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string;

  @Column({ type: 'text', nullable: true, select: false })
  refresh_token: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_id: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country_code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile: string;

  // Self-referencing FK (referral_id → users.id)
  @ManyToOne(() => User, (user) => user.referredUsers, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referral_id' })
  referral: User;

  @OneToMany(() => User, (user) => user.referral)
  referredUsers: User[];

  // Relation with user_types
  @ManyToOne(() => UserType, (userType) => userType.id, { eager: true })
  @JoinColumn({ name: 'user_type_id' })
  userType: UserType;

  // Relation with registration_types
  @ManyToOne(() => RegistrationType, (regType) => regType.id, { eager: true })
  @JoinColumn({ name: 'registration_type_id' })
  registrationType: RegistrationType;

  // Relation with membership_types
  @ManyToOne(() => MembershipType, (membershipType) => membershipType.id, {
    eager: true,
  })
  @JoinColumn({ name: 'membership_type_id' })
  membershipType: MembershipType;

  // ✅ New columns
  @Column({ type: 'tinyint', width: 1, default: 0 })
  email_verified: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  phone_number_verified: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  status: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_admin_deleted: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_self_deleted: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  admin_deleted_reason: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  self_deleted_reason: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Vimas e-wallet — store credit usable toward normal product checkout
  // only (never reward_mall_products). Every balance change must go
  // through VimasEWalletService so a matching VimasEWalletTransaction row
  // is always created — see vimas-e-wallet.service.ts.
  @Column({
    name: 'vimas_e_wallet_balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  vimasEWalletBalance: number;

  // 0 = inactive, 1 = active
  @Column({
    name: 'vimas_e_wallet_status',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  vimasEWalletStatus: number;

  // @Column({ type: 'varchar', length: 255, unique: true })
  // unique_id: string; // New unique_id column

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @OneToMany(() => UserSessionStorage, (session) => session.user)
  sessionsStorage: UserSessionStorage[];

  @OneToMany(() => ContactInfo, (contactInfo) => contactInfo.user)
  contactInfos: ContactInfo[];

  @OneToMany(() => Order, (order) => order.buyer)
  ordersAsBuyer: Order[];

  @OneToMany(
    () => PointUserBalance,
    (pointUserbalance) => pointUserbalance.user,
  )
  pointUserbalance: PointUserBalance[];

  @OneToMany(() => PointDistributionPurchaseQueue, (queue) => queue.user)
  pointDistributionQueues: PointDistributionPurchaseQueue[];

  @OneToMany(() => VimasEWalletTransaction, (txn) => txn.user)
  walletTransactions: VimasEWalletTransaction[];
}
