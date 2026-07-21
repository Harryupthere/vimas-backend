import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PointPoolDetail } from './point-pool-detail.entity';

export enum PointPoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('point_pools')
export class PointPool {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'pool_detail_id', type: 'bigint' })
  poolDetailId: number;

  @ManyToOne(() => PointPoolDetail)
  @JoinColumn({ name: 'pool_detail_id' })
  poolDetail: PointPoolDetail;

  @Column({ name: 'from_datetime', type: 'datetime' })
  fromDatetime: Date;

  @Column({ name: 'to_datetime', type: 'datetime' })
  toDatetime: Date;

  @Column({ name: 'total_users', type: 'int', default: 0 })
  totalUsers: number;

  @Column({ name: 'total_admins', type: 'int', default: 0 })
  totalAdmins: number;

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

  @Column({
    name: 'distributed_points',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  distributedPoints: number;

  @Column({
    type: 'enum',
    enum: PointPoolStatus,
    default: PointPoolStatus.ACTIVE,
  })
  status: PointPoolStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
