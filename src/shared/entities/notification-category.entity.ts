import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_categories')
export class NotificationCategory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  // 0=inactive, 1=active — inactive categories stop receiving new
  // notifications, but existing rows already tied to them are untouched.
  @Column({ type: 'tinyint', width: 1, default: 1 })
  status: number;

  // Whether this category shows up in the user's notification-preferences
  // screen at all. false = mandatory/always-on (e.g. security/account
  // notices) and can't be toggled off; true = the user may disable it via
  // notification_preferences, and that disable is honoured at read time.
  @Column({ name: 'user_preference', type: 'boolean', default: false })
  userPreference: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
