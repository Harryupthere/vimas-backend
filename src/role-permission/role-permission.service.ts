import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Role } from '../shared/entities/role.entity';
import { Permission } from '../shared/entities/permission.entity';
import { RolePermission } from '../shared/entities/role-permission.entity';

import { UpdateRolePermissionsDto } from './dto/role-permission.dto';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get all permissions assigned to a role
   */
  async getRolePermissions(roleId: number) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const rolePermissions = await this.rolePermissionRepo.find({
      where: {
        role_id: roleId,
      },
      relations: {
        permission: true,
      },
      order: {
        id: 'ASC',
      },
    });

    return {
      data: {
        role: {
          id: role.id,
          name: role.name,
          slug: role.slug,
        },
        permissions: rolePermissions.map((item) => ({
          id: item.permission.id,
          name: item.permission.name,
          slug: item.permission.slug,
          module: item.permission.module,
          action: item.permission.action,
          description: item.permission.description,
        })),
      },
      message: 'Role permissions fetched successfully',
    };
  }

  /**
   * Replace all permissions assigned to a role
   */
  async updateRolePermissions(roleId: number, dto: UpdateRolePermissionsDto) {
    const role = await this.roleRepo.findOne({
      where: {
        id: roleId,
        is_active: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Remove duplicate IDs just as an additional safety measure
    const permissionIds = [...new Set(dto.permissionIds)];

    // If empty array is allowed, this removes all permissions.
    // If you don't want that behavior, remove this logic and throw BadRequestException.
    if (permissionIds.length === 0) {
      await this.rolePermissionRepo.delete({
        role_id: roleId,
      });

      return {
        data: {
          role_id: roleId,
          permissionIds: [],
        },
        message: 'All permissions removed from role',
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
        `Invalid permission IDs: ${missingPermissionIds.join(', ')}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      /**
       * Remove existing permissions
       */
      await manager.delete(RolePermission, {
        role_id: roleId,
      });

      /**
       * Create new assignments
       */
      const rolePermissions = permissionIds.map((permissionId) =>
        manager.create(RolePermission, {
          role_id: roleId,
          permission_id: permissionId,
        }),
      );

      await manager.save(RolePermission, rolePermissions);
    });

    return {
      data: {
        role_id: roleId,
        permissionIds,
      },
      message: 'Role permissions updated successfully',
    };
  }
}
