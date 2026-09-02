import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RewardMallReceiptStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  FAILED = 'failed',
}

// Matches the `reward_mall_receipts` table exactly (created manually, no
// migration owned by this codebase). Related to `reward_mall_purchase` at
// the application level only, by matching `invoice_id` values — same
// no-FK relationship as Receipt <-> Order.
@Entity('reward_mall_receipts')
export class RewardMallReceipt {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'invoice_id', type: 'varchar', length: 30, unique: true })
  invoiceId: string;

  @Column({ name: 's3_key', type: 'varchar', length: 255, nullable: true })
  s3Key: string | null;

  @Column({
    type: 'enum',
    enum: RewardMallReceiptStatus,
    default: RewardMallReceiptStatus.PENDING,
  })
  status: RewardMallReceiptStatus;

  @Column({ name: 'generated_at', type: 'datetime', nullable: true })
  generatedAt: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
