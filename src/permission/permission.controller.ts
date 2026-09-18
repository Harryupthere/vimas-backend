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

import { PermissionService } from "./permission.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";

@Controller("admin/permissions")
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
  ) {}

  @Post()
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  findAll() {
    return this.permissionService.findAll();
  }

  @Get("grouped")
  findAllGroupedByModule() {
    return this.permissionService.findAllGroupedByModule();
  }

  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.permissionService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(id, dto);
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.permissionService.remove(id);
  }
}