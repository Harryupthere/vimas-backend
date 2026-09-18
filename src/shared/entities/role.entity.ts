import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AdminRole } from "./admin-role.entity";
import { RolePermission } from "./role-permission.entity";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

@Column({
  type: "varchar",
  length: 255,
  nullable: true,
})
description: string | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_system: boolean;

  @OneToMany(() => AdminRole, (adminRole) => adminRole.role)
  admin_roles: AdminRole[];

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.role,
  )
  role_permissions: RolePermission[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}