import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import {
  AdminMenu,
  AdminMenuType,
} from "../shared/entities/admin-menu.entity";
import { AdminRole } from "../shared/entities/admin-role.entity";
import { RolePermission } from "../shared/entities/role-permission.entity";

import { CreateAdminMenuDto } from "./dto/create-admin-menu.dto";
import { UpdateAdminMenuDto } from "./dto/update-admin-menu.dto";

interface SidebarMenuNode {
  id: number;
  name: string;
  slug: string;
  route: string | null;
  feature_key: string | null;
  icon: string | null;
  menu_type: AdminMenuType;
  sort_order: number;
  children: SidebarMenuNode[];
  permissions: string[];
}

@Injectable()
export class AdminMenuService {
  constructor(
    @InjectRepository(AdminMenu)
    private readonly adminMenuRepo: Repository<AdminMenu>,
    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  /**
   * Create a new admin menu
   */
  async create(dto: CreateAdminMenuDto): Promise<any> {
    // Check duplicate slug
    const existingSlug = await this.adminMenuRepo.findOne({
      where: {
        slug: dto.slug,
      },
    });

    if (existingSlug) {
      throw new ConflictException(
        "Admin menu with this slug already exists",
      );
    }

    // Validate parent menu
    if (dto.parent_id) {
      const parent = await this.adminMenuRepo.findOne({
        where: {
          id: dto.parent_id,
        },
      });

      if (!parent) {
        throw new NotFoundException("Parent menu not found");
      }
    }

    const adminMenu = this.adminMenuRepo.create({
      parent_id: dto.parent_id ?? undefined,
      name: dto.name,
      slug: dto.slug,
      route: dto.route ?? undefined,
      feature_key: dto.feature_key ?? undefined,
      icon: dto.icon ?? undefined,
      menu_type: dto.menu_type ?? AdminMenuType.PAGE,
      sort_order: dto.sort_order ?? 0,
      is_active: dto.is_active ?? true,
    });

    const savedAdminMenu = await this.adminMenuRepo.save(adminMenu);

    return {
      data: savedAdminMenu,
      message: "Admin menu created successfully",
    };
  }

  /**
   * Get all admin menus
   */
  async findAll(): Promise<any> {
    const adminMenus = await this.adminMenuRepo.find({
      order: {
        sort_order: "ASC",
      },
    });

    return {
      data: adminMenus,
      message: "Admin menus fetched successfully",
    };
  }

  /**
   * Get active admin menus
   */
  async findAllActive(): Promise<any> {
    const adminMenus = await this.adminMenuRepo.find({
      where: {
        is_active: true,
      },
      order: {
        sort_order: "ASC",
      },
    });

    return {
      data: adminMenus,
      message: "Active admin menus fetched successfully",
    };
  }

  /**
   * Get admin menu by ID
   */
  async findOne(id: number): Promise<any> {
    const adminMenu = await this.adminMenuRepo.findOne({
      where: {
        id,
      },
    });

    if (!adminMenu) {
      throw new NotFoundException("Admin menu not found");
    }

    return {
      data: adminMenu,
      message: "Admin menu fetched successfully",
    };
  }

  /**
   * Update admin menu
   */
  async update(
    id: number,
    dto: UpdateAdminMenuDto,
  ): Promise<any> {
    const adminMenu = await this.adminMenuRepo.findOne({
      where: {
        id,
      },
    });

    if (!adminMenu) {
      throw new NotFoundException("Admin menu not found");
    }

    // Check duplicate slug
    if (dto.slug && dto.slug !== adminMenu.slug) {
      const existingSlug = await this.adminMenuRepo.findOne({
        where: {
          slug: dto.slug,
        },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(
          "Admin menu with this slug already exists",
        );
      }
    }

    // Validate parent menu
    if (dto.parent_id !== undefined && dto.parent_id !== null) {
      if (dto.parent_id === id) {
        throw new ConflictException(
          "Admin menu cannot be its own parent",
        );
      }

      const parent = await this.adminMenuRepo.findOne({
        where: {
          id: dto.parent_id,
        },
      });

      if (!parent) {
        throw new NotFoundException("Parent menu not found");
      }
    }

    Object.assign(adminMenu, {
      ...(dto.parent_id !== undefined && {
        parent_id: dto.parent_id,
      }),
      ...(dto.name !== undefined && {
        name: dto.name,
      }),
      ...(dto.slug !== undefined && {
        slug: dto.slug,
      }),
      ...(dto.route !== undefined && {
        route: dto.route,
      }),
      ...(dto.feature_key !== undefined && {
        feature_key: dto.feature_key,
      }),
      ...(dto.icon !== undefined && {
        icon: dto.icon,
      }),
      ...(dto.menu_type !== undefined && {
        menu_type: dto.menu_type,
      }),
      ...(dto.sort_order !== undefined && {
        sort_order: dto.sort_order,
      }),
      ...(dto.is_active !== undefined && {
        is_active: dto.is_active,
      }),
    });

    const updatedAdminMenu = await this.adminMenuRepo.save(adminMenu);

    return {
      data: updatedAdminMenu,
      message: "Admin menu updated successfully",
    };
  }

  /**
   * Delete admin menu
   */
  async remove(id: number): Promise<any> {
    const adminMenu = await this.adminMenuRepo.findOne({
      where: {
        id,
      },
    });

    if (!adminMenu) {
      throw new NotFoundException("Admin menu not found");
    }

    // Check whether admin menu has children
    const childMenu = await this.adminMenuRepo.findOne({
      where: {
        parent_id: id,
      },
    });

    if (childMenu) {
      throw new ConflictException(
        "Admin menu cannot be deleted because it has child menus",
      );
    }

    await this.adminMenuRepo.remove(adminMenu);

    return {
      data: null,
      message: "Admin menu deleted successfully",
    };
  }

  /**
   * Build the sidebar menu tree visible to a given admin, based on the
   * permissions granted through their active roles.
   */
  async getSidebar(adminId: number): Promise<any> {
    const adminRoles = await this.adminRoleRepo.find({
      where: { admin_id: adminId },
      relations: { role: true },
    });

    if (!adminRoles.length) {
      return { data: [], message: "Sidebar fetched successfully" };
    }

    const activeRoleIds = adminRoles
      .filter((adminRole) => adminRole.role?.is_active === true)
      .map((adminRole) => adminRole.role_id);

    let permissionSlugs = new Set<string>();

    if (activeRoleIds.length) {
      const rolePermissions = await this.rolePermissionRepo.find({
        where: { role_id: In(activeRoleIds) },
        relations: { permission: true },
      });

      permissionSlugs = new Set(
        rolePermissions.map((rolePermission) => rolePermission.permission.slug),
      );
    }

    const menus = await this.adminMenuRepo.find({
      where: { is_active: true },
      relations: { menu_permissions: { permission: true } },
      order: { sort_order: "ASC" },
    });

    const childrenByParentId = new Map<number, AdminMenu[]>();
    const rootMenus: AdminMenu[] = [];

    for (const menu of menus) {
      if (menu.parent_id === null || menu.parent_id === undefined) {
        rootMenus.push(menu);
        continue;
      }

      if (!childrenByParentId.has(menu.parent_id)) {
        childrenByParentId.set(menu.parent_id, []);
      }
      childrenByParentId.get(menu.parent_id)!.push(menu);
    }

    const visited = new Set<number>();

    const buildNode = (menu: AdminMenu): SidebarMenuNode | null => {
      if (visited.has(menu.id)) return null;
      visited.add(menu.id);

      const requiredSlugs = [
        ...new Set(
          menu.menu_permissions.map((menuPermission) => menuPermission.permission.slug),
        ),
      ];

      const hasAccess =
        requiredSlugs.length === 0 ||
        requiredSlugs.some((slug) => permissionSlugs.has(slug));

      const childMenus = childrenByParentId.get(menu.id) ?? [];
      const children = childMenus
        .map((childMenu) => buildNode(childMenu))
        .filter((node): node is SidebarMenuNode => node !== null);

      const isGroup = menu.menu_type === AdminMenuType.GROUP;
      const visible = isGroup ? hasAccess && children.length > 0 : hasAccess || children.length > 0;

      if (!visible) return null;

      return {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        route: menu.route,
        feature_key: menu.feature_key,
        icon: menu.icon,
        menu_type: menu.menu_type,
        sort_order: menu.sort_order,
        children,
        permissions: requiredSlugs,
      };
    };

    const sidebar = rootMenus
      .map((menu) => buildNode(menu))
      .filter((node): node is SidebarMenuNode => node !== null);

    return { data: sidebar, message: "Sidebar fetched successfully" };
  }
}
