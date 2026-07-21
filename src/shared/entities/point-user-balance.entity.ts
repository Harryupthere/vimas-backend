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

@Entity('point_user_balances')
export class PointUserBalance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unique: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

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
