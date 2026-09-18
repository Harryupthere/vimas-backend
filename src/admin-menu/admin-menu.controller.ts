import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";

import { AdminMenuService } from "./admin-menu.service";
import { CreateAdminMenuDto } from "./dto/create-admin-menu.dto";
import { UpdateAdminMenuDto } from "./dto/update-admin-menu.dto";

@Controller("admin/admin-menus")
export class AdminMenuController {
  constructor(
    private readonly adminMenuService: AdminMenuService,
  ) {}

  @Post()
  create(@Body() dto: CreateAdminMenuDto) {
    return this.adminMenuService.create(dto);
  }

  @Get()
  findAll() {
    return this.adminMenuService.findAll();
  }

  @Get("active")
  findAllActive() {
    return this.adminMenuService.findAllActive();
  }

  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.adminMenuService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAdminMenuDto,
  ) {
    return this.adminMenuService.update(id, dto);
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.adminMenuService.remove(id);
  }
}
