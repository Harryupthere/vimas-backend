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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/point-pool-detail')
export class PointPoolDetailAdminController {
  constructor(
    private readonly pointPoolDetailService: PointPoolDetailService,
  ) {}

  @Post()
  create(@Body() dto: CreatePointPoolDetailDto) {
    return this.pointPoolDetailService.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.pointPoolDetailService.findAll(status, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolDetailService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointPoolDetailDto,
  ) {
    return this.pointPoolDetailService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolDetailService.remove(id);
  }
}
