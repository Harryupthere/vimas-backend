import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

// Column decorators only — synchronize is off (see data-source.ts), so the
// real indexes are created by the migration's raw SQL
// (idx_vimas_e_wallet_transactions_user_id,
// idx_vimas_e_wallet_transactions_reference); these @Index() decorators are
// documentation of the same shape, not what actually runs.

export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  CHECKOUT = 'CHECKOUT',
  REFUND = 'REFUND',
}

export enum WalletTransactionCreatedBy {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

// Immutable ledger row for every vimas_e_wallet_balance change on a user —
// see VimasEWalletService: every balance mutation (admin credit/debit,
// checkout deduction, compensating refund) must create exactly one of
// these in the same DB transaction as the balance update.
@Entity('vimas_e_wallet_transactions')
@Index(['referenceType', 'referenceId'])
export class VimasEWalletTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, (user) => user.walletTransactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 2 })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 2 })
  balanceAfter: number;

  @Column({
    name: 'created_by',
    type: 'enum',
    enum: WalletTransactionCreatedBy,
    default: WalletTransactionCreatedBy.SYSTEM,
  })
  createdBy: WalletTransactionCreatedBy;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    name: 'reference_type',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({
    name: 'reference_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  referenceId: number | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
