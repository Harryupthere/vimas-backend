import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProductPaymentOption } from './product-payment-option.entity';

@Entity('payment_options')
export class PaymentOption {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  note: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  charges: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProductPaymentOption, (ppo) => ppo.paymentOption)
  productPaymentOptions: ProductPaymentOption[];
}
