import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  AdminMenu,
  AdminMenuType,
} from "../shared/entities/admin-menu.entity";

import { CreateAdminMenuDto } from "./dto/create-admin-menu.dto";
import { UpdateAdminMenuDto } from "./dto/update-admin-menu.dto";

@Injectable()
export class AdminMenuService {
  constructor(
    @InjectRepository(AdminMenu)
    private readonly adminMenuRepo: Repository<AdminMenu>,
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
}
