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
import { PointAdminBalanceService } from '../point-admin-balance.service';
import { CreatePointAdminBalanceDto } from '../dto/create-point-admin-balance.dto';
import { UpdatePointAdminBalanceDto } from '../dto/update-point-admin-balance.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/point-admin-balance')
export class PointAdminBalanceAdminController {
  constructor(
    private readonly pointAdminBalanceService: PointAdminBalanceService,
  ) {}

  @Post()
  @Permission('point-admin-balance.create')
  create(@Body() dto: CreatePointAdminBalanceDto) {
    return this.pointAdminBalanceService.create(dto);
  }

  @Get()
  @Permission('point-admin-balance.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.pointAdminBalanceService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Permission('point-admin-balance.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointAdminBalanceService.findOne(id);
  }

  @Patch(':id')
  @Permission('point-admin-balance.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointAdminBalanceDto,
  ) {
    return this.pointAdminBalanceService.update(id, dto);
  }

  @Delete(':id')
  @Permission('point-admin-balance.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointAdminBalanceService.remove(id);
  }
}
