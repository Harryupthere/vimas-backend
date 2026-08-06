import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from '../dashboard.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardUserController {
  constructor(private readonly dashboardService: DashboardService) {}

  // "my dashboard" — scoped to the logged-in user's own wallet only
  @Get()
  getDashboard(@Req() req: any) {
    return this.dashboardService.getDashboard(req.user.id);
  }
}
