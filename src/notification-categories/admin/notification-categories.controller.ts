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
import { NotificationCategoriesService } from '../notification-categories.service';
import { CreateNotificationCategoryDto } from '../dto/create-notification-category.dto';
import { UpdateNotificationCategoryDto } from '../dto/update-notification-category.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)

// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/notification-categories')
export class NotificationCategoriesAdminController {
  constructor(
    private readonly notificationCategoriesService: NotificationCategoriesService,
  ) {}

  @Post()
  @Permission('notification-categories.create')
  create(@Body() dto: CreateNotificationCategoryDto) {
    return this.notificationCategoriesService.create(dto);
  }

  @Get()
  @Permission('notification-categories.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.notificationCategoriesService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Permission('notification-categories.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationCategoriesService.findOne(id);
  }

  @Patch(':id')
  @Permission('notification-categories.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationCategoryDto,
  ) {
    return this.notificationCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Permission('notification-categories.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationCategoriesService.remove(id);
  }
}
