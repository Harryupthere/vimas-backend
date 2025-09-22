// category-brand.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Category } from './categories.entity';
import { Brand } from './brand.entity';

@Entity('category_brands')
export class CategoryBrand {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Category, (category) => category.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Brand, (brand) => brand.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
