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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/point-admin-balance')
export class PointAdminBalanceAdminController {
  constructor(
    private readonly pointAdminBalanceService: PointAdminBalanceService,
  ) {}

  @Post()
  create(@Body() dto: CreatePointAdminBalanceDto) {
    return this.pointAdminBalanceService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.pointAdminBalanceService.findAll(+page, +limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointAdminBalanceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointAdminBalanceDto,
  ) {
    return this.pointAdminBalanceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointAdminBalanceService.remove(id);
  }
}
