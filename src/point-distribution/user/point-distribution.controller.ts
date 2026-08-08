import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PointDistributionService } from '../point-distribution.service';

@Controller('point-distribution')
export class PointDistributionUserController {
  constructor(
    private readonly pointDistributionService: PointDistributionService,
  ) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.pointDistributionService.findAll(status, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointDistributionService.findOne(id);
  }
}
