import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Role } from "../shared/entities/role.entity";
import { AdminRole } from "../shared/entities/admin-role.entity";

import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,
  ) {}

  /**
   * Create a new role
   */
  async create(dto: CreateRoleDto): Promise<any> {
    // Check duplicate name
    const existingName = await this.roleRepo.findOne({
      where: {
        name: dto.name,
      },
    });

    if (existingName) {
      throw new ConflictException(
        "Role with this name already exists",
      );
    }

    // Check duplicate slug
    const existingSlug = await this.roleRepo.findOne({
      where: {
        slug: dto.slug,
      },
    });

    if (existingSlug) {
      throw new ConflictException(
        "Role with this slug already exists",
      );
    }

    const role = this.roleRepo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      is_active: dto.is_active ?? true,
    });

    const savedRole = await this.roleRepo.save(role);

    return {
      data: savedRole,
      message: "Role created successfully",
    };
  }

  /**
   * Get all roles
   */
  async findAll(): Promise<any> {
    const roles = await this.roleRepo.find({
      order: {
        id: "DESC",
      },
    });

    return {
      data: roles,
      message: "Roles fetched successfully",
    };
  }

  /**
   * Get active roles
   *
   * Useful when creating an admin because the
   * admin creation form should only show active roles.
   */
  async findAllActive(): Promise<any> {
    const roles = await this.roleRepo.find({
      where: {
        is_active: true,
      },
      order: {
        name: "ASC",
      },
    });

    return {
      data: roles,
      message: "Active roles fetched successfully",
    };
  }

  /**
   * Get role by ID
   */
  async findOne(id: number): Promise<any> {
    const role = await this.roleRepo.findOne({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return {
      data: role,
      message: "Role fetched successfully",
    };
  }

  /**
   * Update role
   */
  async update(
    id: number,
    dto: UpdateRoleDto,
  ): Promise<any> {
    const role = await this.roleRepo.findOne({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // Do not allow modification of system roles
    if (role.is_system) {
      throw new ConflictException(
        "System role cannot be modified",
      );
    }

    // Check duplicate name
    if (dto.name && dto.name !== role.name) {
      const existingName = await this.roleRepo.findOne({
        where: {
          name: dto.name,
        },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException(
          "Role with this name already exists",
        );
      }
    }

    // Check duplicate slug
    if (dto.slug && dto.slug !== role.slug) {
      const existingSlug = await this.roleRepo.findOne({
        where: {
          slug: dto.slug,
        },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(
          "Role with this slug already exists",
        );
      }
    }

    Object.assign(role, {
      ...(dto.name !== undefined && {
        name: dto.name,
      }),
      ...(dto.slug !== undefined && {
        slug: dto.slug,
      }),
      ...(dto.description !== undefined && {
        description: dto.description,
      }),
      ...(dto.is_active !== undefined && {
        is_active: dto.is_active,
      }),
    });

    const updatedRole = await this.roleRepo.save(role);

    return {
      data: updatedRole,
      message: "Role updated successfully",
    };
  }

  /**
   * Delete role
   */
  async remove(id: number): Promise<any> {
    const role = await this.roleRepo.findOne({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    // Never delete system roles
    if (role.is_system) {
      throw new ConflictException(
        "System role cannot be deleted",
      );
    }

    // Check whether role is assigned to any admin
    const assignedAdmin = await this.adminRoleRepo.findOne({
      where: {
        role_id: id,
      },
    });

    if (assignedAdmin) {
      throw new ConflictException(
        "Role cannot be deleted because it is assigned to an admin",
      );
    }

    await this.roleRepo.remove(role);

    return {
      data: null,
      message: "Role deleted successfully",
    };
  }
}