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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/notification-categories')
export class NotificationCategoriesAdminController {
  constructor(
    private readonly notificationCategoriesService: NotificationCategoriesService,
  ) {}

  @Post()
  create(@Body() dto: CreateNotificationCategoryDto) {
    return this.notificationCategoriesService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.notificationCategoriesService.findAll(+page, +limit, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationCategoryDto,
  ) {
    return this.notificationCategoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationCategoriesService.remove(id);
  }
}
