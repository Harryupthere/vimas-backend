import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";
import { AdminMenu } from "./admin-menu.entity";
import { Permission } from "./permission.entity";

@Entity("admin_menu_permissions")
export class AdminMenuPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  menu_id: number;

  @Column()
  permission_id: number;

  @ManyToOne(() => AdminMenu, (menu) => menu.menu_permissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "menu_id" })
  menu: AdminMenu;

  @ManyToOne(() => Permission, (permission) => permission.menu_permissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "permission_id" })
  permission: Permission;

  @CreateDateColumn()
  created_at: Date;
}