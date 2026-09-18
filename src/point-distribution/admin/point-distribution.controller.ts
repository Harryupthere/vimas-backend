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
import { PointDistributionService } from '../point-distribution.service';
import { CreatePointDistributionDto } from '../dto/create-point-distribution.dto';
import { UpdatePointDistributionDto } from '../dto/update-point-distribution.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/point-distribution')
export class PointDistributionAdminController {
  constructor(
    private readonly pointDistributionService: PointDistributionService,
  ) {}

  @Post()
  @Permission('point-distribution.create')
  create(@Body() dto: CreatePointDistributionDto) {
    return this.pointDistributionService.create(dto);
  }

  @Get()
  @Permission('point-distribution.view')
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.pointDistributionService.findAll(status, search);
  }

  @Get(':id')
  @Permission('point-distribution.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointDistributionService.findOne(id);
  }

  @Patch(':id')
  @Permission('point-distribution.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointDistributionDto,
  ) {
    return this.pointDistributionService.update(id, dto);
  }

  @Delete(':id')
  @Permission('point-distribution.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointDistributionService.remove(id);
  }
}
