import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './products.entity';

export enum ProductFeedbackStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

@Entity('product_feedback')
export class ProductFeedback {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'parent_feedback_id', type: 'bigint', nullable: true })
  parentFeedbackId: number | null;

  // Self-referencing FK — a reply to another feedback row on the same product
  @ManyToOne(() => ProductFeedback, (feedback) => feedback.replies)
  @JoinColumn({ name: 'parent_feedback_id' })
  parentFeedback: ProductFeedback;

  @OneToMany(() => ProductFeedback, (feedback) => feedback.parentFeedback)
  replies: ProductFeedback[];

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  rating: number | null;

  @Column({ type: 'text' })
  comment: string;

  @Column({ name: 'like_count', type: 'int', unsigned: true, default: 0 })
  likeCount: number;

  @Column({ name: 'reply_count', type: 'int', unsigned: true, default: 0 })
  replyCount: number;

  @Column({
    type: 'enum',
    enum: ProductFeedbackStatus,
    default: ProductFeedbackStatus.ACTIVE,
  })
  status: ProductFeedbackStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
