import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Admin } from './admin.entity';

@Entity('point_admin_balances')
export class PointAdminBalance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'admin_id', type: 'bigint', unique: true })
  adminId: number;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column({
    name: 'total_credit',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  totalCredit: number;

  @Column({
    name: 'total_debit',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  totalDebit: number;

  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  currentBalance: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
