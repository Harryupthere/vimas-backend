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
import { NotificationTypesService } from '../notification-types.service';
import { CreateNotificationTypeDto } from '../dto/create-notification-type.dto';
import { UpdateNotificationTypeDto } from '../dto/update-notification-type.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/notification-types')
export class NotificationTypesAdminController {
  constructor(
    private readonly notificationTypesService: NotificationTypesService,
  ) {}

  @Post()
  create(@Body() dto: CreateNotificationTypeDto) {
    return this.notificationTypesService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.notificationTypesService.findAll(+page, +limit, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationTypesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationTypeDto,
  ) {
    return this.notificationTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationTypesService.remove(id);
  }
}
