import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';

import { AdminRoleService } from './admin-role.service';
import { UpdateAdminRolesDto } from './dto/admin-role.dto';

@Controller('admin/admins')
export class AdminRoleController {
  constructor(private readonly adminRoleService: AdminRoleService) {}

  @Get(':adminId/roles')
  async getAdminRoles(@Param('adminId', ParseIntPipe) adminId: number) {
    return this.adminRoleService.getAdminRoles(adminId);
  }

  @Put(':adminId/roles')
  async updateAdminRoles(
    @Param('adminId', ParseIntPipe) adminId: number,
    @Body() dto: UpdateAdminRolesDto,
  ) {
    return this.adminRoleService.updateAdminRoles(adminId, dto);
  }
}
