import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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

  // Merged, latest-first feed of orders, reward mall redemptions, point
  // transactions, and teammates joining — for the dashboard's "recent
  // activities" section.
  @Get('recent-activities')
  getRecentActivities(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.dashboardService.getRecentActivities(
      req.user.id,
      +page,
      +limit,
    );
  }
}
