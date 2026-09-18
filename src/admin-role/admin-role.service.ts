import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Admin } from '../shared/entities/admin.entity';
import { Role } from '../shared/entities/role.entity';
import { AdminRole } from '../shared/entities/admin-role.entity';

import { UpdateAdminRolesDto } from './dto/admin-role.dto';

@Injectable()
export class AdminRoleService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,

    private readonly dataSource: DataSource,
  ) {}

  async getAdminRoles(adminId: number) {
    const admin = await this.adminRepo.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminRoles = await this.adminRoleRepo.find({
      where: {
        admin_id: adminId,
      },
      relations: {
        role: true,
      },
      order: {
        id: 'ASC',
      },
    });

    return {
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
        },
        roles: adminRoles.map((item) => ({
          id: item.role.id,
          name: item.role.name,
          slug: item.role.slug,
          description: item.role.description,
          is_active: item.role.is_active,
          is_system: item.role.is_system,
        })),
      },
      message: 'Admin roles fetched successfully',
    };
  }

  async updateAdminRoles(adminId: number, dto: UpdateAdminRolesDto) {
    const admin = await this.adminRepo.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const roleIds = [...new Set(dto.roleIds)];

    /*
     * Prevent assigning inactive roles.
     */
    if (roleIds.length > 0) {
      const roles = await this.roleRepo.find({
        where: {
          id: In(roleIds),
        },
      });

      if (roles.length !== roleIds.length) {
        const foundIds = new Set(roles.map((role) => role.id));

        const missingRoleIds = roleIds.filter((id) => !foundIds.has(id));

        throw new BadRequestException(
          `Invalid role IDs: ${missingRoleIds.join(', ')}`,
        );
      }

      const inactiveRoles = roles.filter((role) => !role.is_active);

      if (inactiveRoles.length > 0) {
        throw new BadRequestException(
          `Cannot assign inactive role(s): ${inactiveRoles
            .map((role) => role.name)
            .join(', ')}`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      /*
       * Remove current role assignments.
       */
      await manager.delete(AdminRole, {
        admin_id: adminId,
      });

      /*
       * Add new role assignments.
       */
      if (roleIds.length > 0) {
        const adminRoles = roleIds.map((roleId) =>
          manager.create(AdminRole, {
            admin_id: adminId,
            role_id: roleId,
          }),
        );

        await manager.save(AdminRole, adminRoles);
      }
    });

    return {
      data: {
        admin_id: adminId,
        roleIds,
      },
      message: 'Admin roles updated successfully',
    };
  }
}
