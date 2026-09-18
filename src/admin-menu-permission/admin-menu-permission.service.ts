import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import { AdminMenu } from "../shared/entities/admin-menu.entity";
import { Permission } from "../shared/entities/permission.entity";
import { AdminMenuPermission } from "../shared/entities/admin-menu-permission.entity";

import { UpdateAdminMenuPermissionsDto } from "./dto/admin-menu-permission.dto";

@Injectable()
export class AdminMenuPermissionService {
  constructor(
    @InjectRepository(AdminMenu)
    private readonly adminMenuRepo: Repository<AdminMenu>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(AdminMenuPermission)
    private readonly adminMenuPermissionRepo: Repository<AdminMenuPermission>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get all permissions assigned to a menu
   */
  async getMenuPermissions(menuId: number) {
    const menu = await this.adminMenuRepo.findOne({
      where: { id: menuId },
    });

    if (!menu) {
      throw new NotFoundException("Admin menu not found");
    }

    const menuPermissions = await this.adminMenuPermissionRepo.find({
      where: {
        menu_id: menuId,
      },
      relations: {
        permission: true,
      },
      order: {
        id: "ASC",
      },
    });

    return {
      data: {
        menu: {
          id: menu.id,
          name: menu.name,
          slug: menu.slug,
        },
        permissions: menuPermissions.map((item) => ({
          id: item.permission.id,
          name: item.permission.name,
          slug: item.permission.slug,
          module: item.permission.module,
          action: item.permission.action,
          description: item.permission.description,
        })),
      },
      message: "Admin menu permissions fetched successfully",
    };
  }

  /**
   * Replace all permissions assigned to a menu
   */
  async updateMenuPermissions(
    menuId: number,
    dto: UpdateAdminMenuPermissionsDto,
  ) {
    const menu = await this.adminMenuRepo.findOne({
      where: { id: menuId },
    });

    if (!menu) {
      throw new NotFoundException("Admin menu not found");
    }

    // Remove duplicate IDs just as an additional safety measure
    const permissionIds = [...new Set(dto.permissionIds)];

    // If empty array is allowed, this removes all permissions.
    // If you don't want that behavior, remove this logic and throw BadRequestException.
    if (permissionIds.length === 0) {
      await this.adminMenuPermissionRepo.delete({
        menu_id: menuId,
      });

      return {
        data: {
          menu_id: menuId,
          permissionIds: [],
        },
        message: "All permissions removed from menu",
      };
    }

    // Check that all permissions actually exist
    const permissions = await this.permissionRepo.find({
      where: {
        id: In(permissionIds),
      },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = new Set(permissions.map((permission) => permission.id));

      const missingPermissionIds = permissionIds.filter(
        (id) => !foundIds.has(id),
      );

      throw new BadRequestException(
        `Invalid permission IDs: ${missingPermissionIds.join(", ")}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      /**
       * Remove existing permissions
       */
      await manager.delete(AdminMenuPermission, {
        menu_id: menuId,
      });

      /**
       * Create new assignments
       */
      const menuPermissions = permissionIds.map((permissionId) =>
        manager.create(AdminMenuPermission, {
          menu_id: menuId,
          permission_id: permissionId,
        }),
      );

      await manager.save(AdminMenuPermission, menuPermissions);
    });

    return {
      data: {
        menu_id: menuId,
        permissionIds,
      },
      message: "Admin menu permissions updated successfully",
    };
  }
}
