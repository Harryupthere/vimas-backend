import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_types')
export class NotificationType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  primaryColor: string;

  @Column({
    name: 'secondary_color',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  secondaryColor: string;

  // 0=inactive, 1=active
  @Column({ type: 'tinyint', width: 1, default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
