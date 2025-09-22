import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './products.entity';

@Entity('product_actions')
export class ProductAction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  // store FK column AND relation
  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (p) => p.productActions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'current_stage',
    type: 'tinyint',
    default: 0,
    comment: '0=listing,1=update',
  })
  currentStage: number;

  @Column({
    name: 'current_status',
    type: 'tinyint',
    default: 0,
    comment: '0=inactive,1=active',
  })
  currentStatus: number;

  @Column({
    name: 'attempt_type',
    type: 'tinyint',
    default: 0,
    comment: '0=new,1=reattempt',
  })
  attemptType: number;

  @Column({ name: 'admin_remarks', type: 'json', nullable: true })
  adminRemarks: string[] | null;

  @Column({ name: 'merchant_remarks', type: 'json', nullable: true })
  merchantRemarks: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;
}
