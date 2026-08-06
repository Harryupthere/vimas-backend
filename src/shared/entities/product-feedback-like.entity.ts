import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ProductFeedback } from './product-feedback.entity';

@Entity('product_feedback_likes')
@Unique(['feedback', 'user'])
export class ProductFeedbackLike {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'feedback_id', type: 'bigint' })
  feedbackId: number;

  @ManyToOne(() => ProductFeedback)
  @JoinColumn({ name: 'feedback_id' })
  feedback: ProductFeedback;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
