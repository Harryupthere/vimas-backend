import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";
import { Admin } from "./admin.entity";
import { Role } from "./role.entity";

@Entity("admin_roles")
export class AdminRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  admin_id: number;

  @Column()
  role_id: number;

  @ManyToOne(() => Admin, (admin) => admin.admin_roles, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "admin_id" })
  admin: Admin;

  @ManyToOne(() => Role, (role) => role.admin_roles, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @CreateDateColumn()
  created_at: Date;
}