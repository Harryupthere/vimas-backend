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
import { PointPoolDetailService } from '../point-pool-detail.service';
import { CreatePointPoolDetailDto } from '../dto/create-point-pool-detail.dto';
import { UpdatePointPoolDetailDto } from '../dto/update-point-pool-detail.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/point-pool-detail')
export class PointPoolDetailAdminController {
  constructor(
    private readonly pointPoolDetailService: PointPoolDetailService,
  ) {}

  @Post()
  @Permission('point-pool-detail.create')
  create(@Body() dto: CreatePointPoolDetailDto) {
    return this.pointPoolDetailService.create(dto);
  }

  @Get()
  @Permission('point-pool-detail.view')
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.pointPoolDetailService.findAll(status, search);
  }

  @Get(':id')
  @Permission('point-pool-detail.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolDetailService.findOne(id);
  }

  @Patch(':id')
  @Permission('point-pool-detail.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointPoolDetailDto,
  ) {
    return this.pointPoolDetailService.update(id, dto);
  }

  @Delete(':id')
  @Permission('point-pool-detail.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolDetailService.remove(id);
  }
}
