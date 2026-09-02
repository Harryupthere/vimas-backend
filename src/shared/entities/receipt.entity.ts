import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReceiptStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  FAILED = 'failed',
}

// Matches the `receipts` table exactly (created manually, no migration owned
// by this codebase — see the migration note in the receipts module). Related
// to `orders` at the application level only, by matching `invoice_id`
// values: orders.invoice_id is indexed but not unique (many rows share one
// invoice), while this table's invoice_id is unique (one receipt per
// invoice) — there is no FK between them.
@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'invoice_id', type: 'varchar', length: 30, unique: true })
  invoiceId: string;

  @Column({ name: 's3_key', type: 'varchar', length: 255, nullable: true })
  s3Key: string | null;

  @Column({
    type: 'enum',
    enum: ReceiptStatus,
    default: ReceiptStatus.PENDING,
  })
  status: ReceiptStatus;

  @Column({ name: 'generated_at', type: 'datetime', nullable: true })
  generatedAt: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
