import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotificationCategoriesService } from '../notification-categories.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notification-categories')
export class NotificationCategoriesUserController {
  constructor(
    private readonly notificationCategoriesService: NotificationCategoriesService,
  ) {}

  // Lets the frontend populate a "filter my notifications by category"
  // picker — active categories only, regardless of userPreference (that
  // flag only governs whether a category can be toggled off, not whether
  // it can be filtered by).
  @Get()
  findAll(@Query('search') search?: string) {
    return this.notificationCategoriesService.findAllForUsers(search);
  }
}
