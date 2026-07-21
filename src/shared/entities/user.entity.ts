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
import { RegistrationType } from './registration_types.entity';
import { Product } from './products.entity';
import { UserSession } from './user_session.entity';
import { UserSessionStorage } from './user_session_storage.entity';
import { ContactInfo } from './contact-info.entity';
import { Order } from './order.entity';
import { PointUserBalance } from './point-user-balance.entity';
import { PointDistributionPurchaseQueue } from './point-distribution-purchase-queue.entity';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: false })
  unique_user_id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: false })
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

  // @Column({ type: 'varchar', length: 255, unique: true })
  // unique_id: string; // New unique_id column

  @OneToMany(() => Product, (product) => product.merchant)
  products: Product[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @OneToMany(() => UserSessionStorage, (session) => session.user)
  sessionsStorage: UserSessionStorage[];

  @OneToMany(() => ContactInfo, (contactInfo) => contactInfo.user)
  contactInfos: ContactInfo[];

  @OneToMany(() => Order, (order) => order.buyer)
  ordersAsBuyer: Order[];

  @OneToMany(() => Order, (order) => order.merchant)
  ordersAsMerchant: Order[];

  @OneToMany(
    () => PointUserBalance,
    (pointUserbalance) => pointUserbalance.user,
  )
  pointUserbalance: PointUserBalance[];

  @OneToMany(() => PointDistributionPurchaseQueue, (queue) => queue.user)
  pointDistributionQueues: PointDistributionPurchaseQueue[];
}
