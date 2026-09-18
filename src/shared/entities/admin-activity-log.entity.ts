import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Admin } from "./admin.entity";

@Entity("admin_activity_logs")
export class AdminActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  admin_id: number;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100 })
  module: string;

  @Column({ length: 100, nullable: true })
  entity_type: string;

  @Column({ nullable: true })
  entity_id: number;

  @Column({ type: "json", nullable: true })
  old_data: Record<string, any>;

  @Column({ type: "json", nullable: true })
  new_data: Record<string, any>;

  @Column({ length: 45, nullable: true })
  ip_address: string;

  @Column({ type: "text", nullable: true })
  user_agent: string;

  @ManyToOne(() => Admin, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "admin_id" })
  admin: Admin;

  @CreateDateColumn()
  created_at: Date;
}