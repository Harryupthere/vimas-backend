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

@Entity('contact_info')
@Unique(['countryCode', 'phoneNumber'])
export class ContactInfo {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, (user) => user.contactInfos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ name: 'country_code', type: 'varchar', length: 10 })
  countryCode: string;

  @Column({ name: 'address_1', type: 'varchar', length: 255 })
  address1: string;

  @Column({ name: 'address_2', type: 'varchar', length: 255, nullable: true })
  address2: string;

  @Column({ type: 'varchar', length: 255 })
  landmark: string;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
