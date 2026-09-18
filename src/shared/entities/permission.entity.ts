import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RolePermission } from "./role-permission.entity";
import { AdminMenuPermission } from "./admin-menu-permission.entity";

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ length: 100 })
  module: string;

  @Column({ length: 50 })
  action: string;

@Column({
  type: "varchar",
  length: 255,
  nullable: true,
})
description: string | null;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
  role_permissions: RolePermission[];

  @OneToMany(
    () => AdminMenuPermission,
    (menuPermission) => menuPermission.permission,
  )
  menu_permissions: AdminMenuPermission[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}