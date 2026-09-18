import { Controller, Get, Req, UseGuards } from "@nestjs/common";

import { AdminMenuService } from "./admin-menu.service";
import { JwtAuthGuard } from "src/shared/auth/strategies/auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("admin/sidebar")
export class AdminSidebarController {
  constructor(
    private readonly adminMenuService: AdminMenuService,
  ) {}

  @Get()
  getSidebar(@Req() req) {
    return this.adminMenuService.getSidebar(req.user.id);
  }
}
