import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AdminMenu } from "../shared/entities/admin-menu.entity";
import { Permission } from "../shared/entities/permission.entity";
import { AdminMenuPermission } from "../shared/entities/admin-menu-permission.entity";

import { AdminMenuPermissionController } from "./admin-menu-permission.controller";
import { AdminMenuPermissionService } from "./admin-menu-permission.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminMenu, Permission, AdminMenuPermission]),
  ],
  controllers: [AdminMenuPermissionController],
  providers: [AdminMenuPermissionService],
  exports: [AdminMenuPermissionService],
})
export class AdminMenuPermissionModule {}
