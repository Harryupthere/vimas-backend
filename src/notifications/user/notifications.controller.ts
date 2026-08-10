import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsUserController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Static-path routes are declared above the ':id' routes below so they
  // are never swallowed by ':id' greedily matching "preferences"/
  // "unread-count"/"read-all" as a param value.
  @Get('preferences')
  getPreferences(@Req() req: any) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences/:categoryId')
  updatePreference(
    @Req() req: any,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(
      req.user.id,
      categoryId,
      dto,
    );
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.notificationsService.findMine(
      req.user.id,
      +page,
      +limit,
      search,
      unreadOnly === 'true',
      categoryId ? +categoryId : undefined,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findMineOne(req.user.id, id);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Patch(':id/hide')
  hide(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.hide(req.user.id, id);
  }
}
