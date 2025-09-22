import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Column,
  JoinColumn,
} from 'typeorm';
import { Product } from './products.entity';
import { PaymentOption } from './payment-option.entity';

@Entity('product_payment_options')
@Unique(['product', 'paymentOption'])
export class ProductPaymentOption {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  product_id: number;

  @Column({ name: 'payment_option_id' })
  payment_option_id: number;

  @ManyToOne(() => Product, (product) => product.paymentOptions)
  @JoinColumn({ name: 'product_id' }) // 👈 FIX
  product: Product;

  @ManyToOne(
    () => PaymentOption,
    (paymentOption) => paymentOption.productPaymentOptions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'payment_option_id' }) // 👈 FIX
  paymentOption: PaymentOption;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
