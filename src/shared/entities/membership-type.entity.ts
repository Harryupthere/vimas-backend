import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('membership_types')
export class MembershipType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  icon?: string;

  // array of strings
  @Column({ type: 'json', nullable: true })
  key_points?: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  colour?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: null,
  })
  points_required?: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
