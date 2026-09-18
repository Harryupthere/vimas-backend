import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from "@nestjs/common";

import { RolePermissionService } from "./role-permission.service";
import { UpdateRolePermissionsDto } from "./dto/role-permission.dto";

@Controller("admin/roles")
export class RolePermissionController {
  constructor(
    private readonly rolePermissionService: RolePermissionService,
  ) {}

  /**
   * GET /admin/roles/:roleId/permissions
   */
  @Get(":roleId/permissions")
  async getRolePermissions(
    @Param("roleId", ParseIntPipe) roleId: number,
  ) {
    return this.rolePermissionService.getRolePermissions(roleId);
  }

  /**
   * PUT /admin/roles/:roleId/permissions
   */
  @Put(":roleId/permissions")
  async updateRolePermissions(
    @Param("roleId", ParseIntPipe) roleId: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolePermissionService.updateRolePermissions(
      roleId,
      dto,
    );
  }
}