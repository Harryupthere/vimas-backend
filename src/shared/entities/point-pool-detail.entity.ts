import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PointPoolDetailType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  HALF_YEARLY = 'half_yearly',
  YEARLY = 'yearly',
}

export enum PointPoolDetailStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('point_pool_details')
export class PointPoolDetail {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'enum', enum: PointPoolDetailType })
  type: PointPoolDetailType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  symbol: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  colour: string;

  @Column({
    type: 'enum',
    enum: PointPoolDetailStatus,
    default: PointPoolDetailStatus.ACTIVE,
  })
  status: PointPoolDetailStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
