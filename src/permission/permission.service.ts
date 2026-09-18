import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Permission } from "../shared/entities/permission.entity";
import { RolePermission } from "../shared/entities/role-permission.entity";
import { AdminMenuPermission } from "../shared/entities/admin-menu-permission.entity";

import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    @InjectRepository(AdminMenuPermission)
    private readonly menuPermissionRepo: Repository<AdminMenuPermission>,
  ) {}

  /**
   * Create permission
   */
  async create(dto: CreatePermissionDto): Promise<any> {
    // Check duplicate slug
    const existingSlug = await this.permissionRepo.findOne({
      where: {
        slug: dto.slug,
      },
    });

    if (existingSlug) {
      throw new ConflictException(
        "Permission with this slug already exists",
      );
    }

    // Check duplicate name
    const existingName = await this.permissionRepo.findOne({
      where: {
        name: dto.name,
      },
    });

    if (existingName) {
      throw new ConflictException(
        "Permission with this name already exists",
      );
    }

    const permission = this.permissionRepo.create({
      name: dto.name,
      slug: dto.slug,
      module: dto.module,
      action: dto.action,
      description: dto.description ?? null,
    });

    const savedPermission =
      await this.permissionRepo.save(permission);

    return {
      data: savedPermission,
      message: "Permission created successfully",
    };
  }

  /**
   * Get all permissions
   */
  async findAll(): Promise<any> {
    const permissions = await this.permissionRepo.find({
      order: {
        module: "ASC",
        id: "ASC",
      },
    });

    return {
      data: permissions,
      message: "Permissions fetched successfully",
    };
  }

  /**
   * Get permissions grouped by module
   *
   * Useful for the React permission management screen.
   */
  async findAllGroupedByModule(): Promise<any> {
    const permissions = await this.permissionRepo.find({
      order: {
        module: "ASC",
        action: "ASC",
      },
    });

    const grouped = permissions.reduce(
      (result, permission) => {
        if (!result[permission.module]) {
          result[permission.module] = [];
        }

        result[permission.module].push(permission);

        return result;
      },
      {} as Record<string, Permission[]>,
    );

    return {
      data: grouped,
      message: "Permissions fetched successfully",
    };
  }

  /**
   * Get permission by ID
   */
  async findOne(id: number): Promise<any> {
    const permission = await this.permissionRepo.findOne({
      where: {
        id,
      },
    });

    if (!permission) {
      throw new NotFoundException("Permission not found");
    }

    return {
      data: permission,
      message: "Permission fetched successfully",
    };
  }

  /**
   * Update permission
   */
  async update(
    id: number,
    dto: UpdatePermissionDto,
  ): Promise<any> {
    const permission = await this.permissionRepo.findOne({
      where: {
        id,
      },
    });

    if (!permission) {
      throw new NotFoundException("Permission not found");
    }

    // Check duplicate name
    if (
      dto.name !== undefined &&
      dto.name !== permission.name
    ) {
      const existingName =
        await this.permissionRepo.findOne({
          where: {
            name: dto.name,
          },
        });

      if (
        existingName &&
        existingName.id !== permission.id
      ) {
        throw new ConflictException(
          "Permission with this name already exists",
        );
      }
    }

    // Check duplicate slug
    if (
      dto.slug !== undefined &&
      dto.slug !== permission.slug
    ) {
      const existingSlug =
        await this.permissionRepo.findOne({
          where: {
            slug: dto.slug,
          },
        });

      if (
        existingSlug &&
        existingSlug.id !== permission.id
      ) {
        throw new ConflictException(
          "Permission with this slug already exists",
        );
      }
    }

    Object.assign(permission, {
      ...(dto.name !== undefined && {
        name: dto.name,
      }),

      ...(dto.slug !== undefined && {
        slug: dto.slug,
      }),

      ...(dto.module !== undefined && {
        module: dto.module,
      }),

      ...(dto.action !== undefined && {
        action: dto.action,
      }),

      ...(dto.description !== undefined && {
        description: dto.description,
      }),
    });

    const updatedPermission =
      await this.permissionRepo.save(permission);

    return {
      data: updatedPermission,
      message: "Permission updated successfully",
    };
  }

  /**
   * Delete permission
   */
  async remove(id: number): Promise<any> {
    const permission = await this.permissionRepo.findOne({
      where: {
        id,
      },
    });

    if (!permission) {
      throw new NotFoundException("Permission not found");
    }

    // Check if permission is assigned to any role
    const rolePermission =
      await this.rolePermissionRepo.findOne({
        where: {
          permission_id: id,
        },
      });

    if (rolePermission) {
      throw new ConflictException(
        "Permission cannot be deleted because it is assigned to a role",
      );
    }

    // Check if permission is assigned to any menu
    const menuPermission =
      await this.menuPermissionRepo.findOne({
        where: {
          permission_id: id,
        },
      });

    if (menuPermission) {
      throw new ConflictException(
        "Permission cannot be deleted because it is assigned to a menu",
      );
    }

    await this.permissionRepo.remove(permission);

    return {
      data: null,
      message: "Permission deleted successfully",
    };
  }
}