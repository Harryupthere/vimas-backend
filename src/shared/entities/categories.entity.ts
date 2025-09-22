import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './products.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number | null;

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // optional: if you want reverse relation
  children?: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
