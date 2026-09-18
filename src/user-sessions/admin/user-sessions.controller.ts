import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserSessionsService } from '../user-sessions.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/user-sessions')
export class UserSessionsAdminController {
  constructor(private readonly userSessionsService: UserSessionsService) {}

  @Get()
  @Permission('user-sessions.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.userSessionsService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Permission('user-sessions.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userSessionsService.findOne(id);
  }
}
