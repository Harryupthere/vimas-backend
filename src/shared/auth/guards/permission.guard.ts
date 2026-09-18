import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { PERMISSION_KEY } from "../decorators/permission.decorator";

import { AdminRole } from "../../entities/admin-role.entity";
import { RolePermission } from "../../entities/role-permission.entity";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    /**
     * Get permission defined by:
     *
     * @Permission("product.create")
     */
    const requiredPermission =
      this.reflector.getAllAndOverride<string>(
        PERMISSION_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /**
     * If no permission is defined,
     * don't perform permission checking.
     */
    if (!requiredPermission) {
      return true;
    }

    /**
     * JWT authentication should already have populated req.user.
     */
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException(
        "Authentication required",
      );
    }

    const adminId = Number(user.id);

    /**
     * Get roles assigned to this admin.
     */
    const adminRoles = await this.adminRoleRepo.find({
      where: {
        admin_id: adminId,
      },
      relations: {
        role: true,
      },
    });

    if (!adminRoles.length) {
      throw new ForbiddenException(
        "No role assigned to this admin",
      );
    }

    /**
     * Only active roles should grant permissions.
     */
    const activeRoleIds = adminRoles
      .filter(
        (adminRole) =>
          adminRole.role?.is_active === true,
      )
      .map((adminRole) => adminRole.role_id);

    if (!activeRoleIds.length) {
      throw new ForbiddenException(
        "No active role assigned to this admin",
      );
    }

    /**
     * Check whether any assigned role
     * contains the required permission.
     */
    const rolePermission =
      await this.rolePermissionRepo
        .createQueryBuilder("rolePermission")
        .innerJoin(
          "rolePermission.permission",
          "permission",
        )
        .where(
          "rolePermission.role_id IN (:...roleIds)",
          {
            roleIds: activeRoleIds,
          },
        )
        .andWhere(
          "permission.slug = :permission",
          {
            permission: requiredPermission,
          },
        )
        .getOne();

    if (!rolePermission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}