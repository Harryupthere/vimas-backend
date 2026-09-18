import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AdminMenuPermission } from "./admin-menu-permission.entity";

export enum AdminMenuType {
  GROUP = "group",
  PAGE = "page",
}

@Entity("admin_menus")
export class AdminMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  parent_id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ length: 255, nullable: true })
  route: string;

  @Column({ length: 100, nullable: true })
  feature_key: string;

  @Column({ length: 100, nullable: true })
  icon: string;

  @Column({
    type: "enum",
    enum: AdminMenuType,
    default: AdminMenuType.PAGE,
  })
  menu_type: AdminMenuType;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ default: true })
  is_active: boolean;

  /**
   * Parent menu
   *
   * Example:
   *
   * Catalog
   *   └── Products
   *
   * Products.parent_id = Catalog.id
   */
  @ManyToOne(() => AdminMenu, (menu) => menu.children, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "parent_id" })
  parent: AdminMenu;

  /**
   * Child menus
   */
  @OneToMany(() => AdminMenu, (menu) => menu.parent)
  children: AdminMenu[];

  /**
   * Permissions required by this menu
   */
  @OneToMany(
    () => AdminMenuPermission,
    (menuPermission) => menuPermission.menu,
  )
  menu_permissions: AdminMenuPermission[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}