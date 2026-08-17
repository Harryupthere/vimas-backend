import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './order.entity';

// Point-in-time snapshot of an order's pricing breakdown (discount/addon/
// coupon amounts and whatever else went into the total at checkout time),
// kept as opaque JSON rather than dedicated columns on `orders` — see
// orders.discount_amount/addon_amount/coupon_amount, dropped in favour of
// this table.
@Entity('order_snapshots')
export class OrderSnapshot {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'MYR' })
  currency: string;

  @Column({ name: 'snapshot_data', type: 'json' })
  snapshotData: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Order, (order) => order.orderSnapshot)
  orders: Order[];
}
