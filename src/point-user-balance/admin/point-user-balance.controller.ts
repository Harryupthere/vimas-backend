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
import { PointUserBalanceService } from '../point-user-balance.service';
import { CreatePointUserBalanceDto } from '../dto/create-point-user-balance.dto';
import { UpdatePointUserBalanceDto } from '../dto/update-point-user-balance.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/point-user-balance')
export class PointUserBalanceAdminController {
  constructor(
    private readonly pointUserBalanceService: PointUserBalanceService,
  ) {}

  @Post()
  @Permission('point-user-balance.create')
  create(@Body() dto: CreatePointUserBalanceDto) {
    return this.pointUserBalanceService.create(dto);
  }

  @Get()
  @Permission('point-user-balance.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.pointUserBalanceService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Permission('point-user-balance.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointUserBalanceService.findOne(id);
  }

  @Patch(':id')
  @Permission('point-user-balance.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointUserBalanceDto,
  ) {
    return this.pointUserBalanceService.update(id, dto);
  }

  @Delete(':id')
  @Permission('point-user-balance.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointUserBalanceService.remove(id);
  }
}
