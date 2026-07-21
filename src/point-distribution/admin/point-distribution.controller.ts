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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/point-distribution')
export class PointDistributionAdminController {
  constructor(
    private readonly pointDistributionService: PointDistributionService,
  ) {}

  @Post()
  create(@Body() dto: CreatePointDistributionDto) {
    return this.pointDistributionService.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.pointDistributionService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointDistributionService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointDistributionDto,
  ) {
    return this.pointDistributionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointDistributionService.remove(id);
  }
}
