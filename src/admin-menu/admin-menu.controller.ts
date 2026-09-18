import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { AdminMenuService } from "./admin-menu.service";
import { CreateAdminMenuDto } from "./dto/create-admin-menu.dto";
import { UpdateAdminMenuDto } from "./dto/update-admin-menu.dto";
import { PermissionGuard } from "src/shared/auth/guards/permission.guard";
import { Permission } from "src/shared/auth/decorators/permission.decorator";
import { JwtAuthGuard } from "src/shared/auth/strategies/auth.guard";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("admin/admin-menus")
export class AdminMenuController {
  constructor(
    private readonly adminMenuService: AdminMenuService,
  ) {}

  @Post()
  @Permission("admin-menus.create")
  create(@Body() dto: CreateAdminMenuDto) {
    return this.adminMenuService.create(dto);
  }

  @Get()
  @Permission("admin-menus.view")
  findAll() {
    return this.adminMenuService.findAll();
  }

  @Get("active")
  @Permission("admin-menus.view")
  findAllActive() {
    return this.adminMenuService.findAllActive();
  }

  @Get(":id")
  @Permission("admin-menus.view")
  findOne(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.adminMenuService.findOne(id);
  }

  @Patch(":id")
  @Permission("admin-menus.update")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAdminMenuDto,
  ) {
    return this.adminMenuService.update(id, dto);
  }

  @Delete(":id")
  @Permission("admin-menus.delete")
  remove(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.adminMenuService.remove(id);
  }
}
