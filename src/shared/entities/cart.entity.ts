import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './products.entity';

export enum CartType {
  CONSUMER = 'consumer',
  RESELLER = 'reseller',
}

@Entity('cart')
@Unique(['buyer', 'product'])
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  quantity: number;

  @Column({ type: 'enum', enum: CartType, default: CartType.CONSUMER })
  cart_type: CartType;

  @Column('decimal', { precision: 10, scale: 2 })
  price_snapshot: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount_snapshot: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;


}
