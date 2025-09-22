import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './products.entity';

@Entity('product_media')
export class ProductMedia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @ManyToOne(() => Product, (product) => product.productMedia, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 500 })
  media_url: string;

  @Column({
    type: 'enum',
    enum: ['image', 'video'],
    default: 'image',
  })
  media_type: 'image' | 'video';

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
  //   @ManyToOne(() => Product, (product) => product.productMedia, {
  //     onDelete: 'CASCADE',
  //   })
  //   @JoinColumn({ name: 'product_id' })
  //   product: Product;
}
