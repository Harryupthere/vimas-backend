import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PointPoolDetailService } from '../point-pool-detail.service';

@Controller('point-pool-detail')
export class PointPoolDetailUserController {
  constructor(
    private readonly pointPoolDetailService: PointPoolDetailService,
  ) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.pointPoolDetailService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolDetailService.findOne(id);
  }
}
