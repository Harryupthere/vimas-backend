import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';

import { AdminMenuPermissionService } from './admin-menu-permission.service';
import { UpdateAdminMenuPermissionsDto } from './dto/admin-menu-permission.dto';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/menus')
export class AdminMenuPermissionController {
  constructor(
    private readonly adminMenuPermissionService: AdminMenuPermissionService,
  ) {}

  /**
   * GET /admin/menus/:menuId/permissions
   */
  @Get(':menuId/permissions')
  @Permission('admins.view')
  async getMenuPermissions(@Param('menuId', ParseIntPipe) menuId: number) {
    return this.adminMenuPermissionService.getMenuPermissions(menuId);
  }

  /**
   * PUT /admin/menus/:menuId/permissions
   */
  @Put(':menuId/permissions')
  @Permission('admins.update')
  async updateMenuPermissions(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body() dto: UpdateAdminMenuPermissionsDto,
  ) {
    return this.adminMenuPermissionService.updateMenuPermissions(menuId, dto);
  }
}
