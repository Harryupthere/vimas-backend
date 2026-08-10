import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { NotificationCategory } from './notification-category.entity';

@Entity('notification_preferences')
@Unique(['userId', 'notificationCategoryId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'notification_category_id', type: 'bigint' })
  notificationCategoryId: number;

  @ManyToOne(() => NotificationCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_category_id' })
  category: NotificationCategory;

  // 0=disabled, 1=enabled
  @Column({ name: 'is_enabled', type: 'tinyint', width: 1, default: 1 })
  isEnabled: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
