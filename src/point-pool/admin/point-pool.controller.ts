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
import { PointPoolService } from '../point-pool.service';
import { CreatePointPoolDto } from '../dto/create-point-pool.dto';
import { UpdatePointPoolDto } from '../dto/update-point-pool.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/point-pool')
export class PointPoolAdminController {
  constructor(private readonly pointPoolService: PointPoolService) {}

  @Post()
  @Permission('point-pool.create')
  create(@Body() dto: CreatePointPoolDto) {
    return this.pointPoolService.create(dto);
  }

  @Get()
  @Permission('point-pool.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.pointPoolService.findAll(+page, +limit, status, search);
  }

  @Get(':id')
  @Permission('point-pool.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolService.findOne(id);
  }

  @Patch(':id')
  @Permission('point-pool.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointPoolDto,
  ) {
    return this.pointPoolService.update(id, dto);
  }

  @Delete(':id')
  @Permission('point-pool.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolService.remove(id);
  }
}
