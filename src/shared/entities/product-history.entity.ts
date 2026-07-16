import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './products.entity';

@Entity('product_history')
export class ProductHistory {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'table_name', type: 'varchar', length: 100 })
  tableName: string;

  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues: Record<string, any> | null;

  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues: Record<string, any> | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
