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
import { NotificationCategory } from './notification-category.entity';
import { NotificationType } from './notification-type.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'notification_category_id', type: 'bigint' })
  notificationCategoryId: number;

  @ManyToOne(() => NotificationCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'notification_category_id' })
  category: NotificationCategory;

  @Column({ name: 'notification_type_id', type: 'bigint' })
  notificationTypeId: number;

  @ManyToOne(() => NotificationType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'notification_type_id' })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  heading: string;

  @Column({ type: 'text', nullable: true })
  subheading: string;

  // Deep-link the frontend should navigate to when the notification is
  // tapped, e.g. "/orders/123" or "/reward-mall-products/45".
  @Column({ type: 'varchar', length: 500, nullable: true })
  route: string;

  // Free-form payload for whatever the frontend needs alongside route/
  // heading (e.g. { orderId, productId, points }) — deliberately untyped
  // since every trigger source shapes it differently.
  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  // 0=unread, 1=read
  @Column({ name: 'is_read', type: 'tinyint', width: 1, default: 0 })
  isRead: number;

  // 0=visible, 1=hidden — set when the user "clears" a notification from
  // their own list; the row stays for audit/admin visibility.
  @Column({ name: 'is_user_hidden', type: 'tinyint', width: 1, default: 0 })
  isUserHidden: number;

  // 0=visible, 1=hidden by admin
  @Column({ name: 'is_admin_hidden', type: 'tinyint', width: 1, default: 0 })
  isAdminHidden: number;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
