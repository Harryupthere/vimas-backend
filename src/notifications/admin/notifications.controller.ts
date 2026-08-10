import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/notifications')
export class NotificationsAdminController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Send a notification — either to one user (userId) or to every active
  // user (broadcast: true).
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.adminCreate(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('userId') userId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('typeId') typeId?: string,
    @Query('isRead') isRead?: string,
    @Query('search') search?: string,
  ) {
    return this.notificationsService.adminFindAll(+page, +limit, {
      userId: userId ? +userId : undefined,
      categoryId: categoryId ? +categoryId : undefined,
      typeId: typeId ? +typeId : undefined,
      isRead: isRead !== undefined ? +isRead : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.adminFindOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.adminUpdate(id, dto);
  }

  @Patch(':id/hide')
  hide(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.adminHide(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.adminRemove(id);
  }
}
