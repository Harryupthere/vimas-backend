import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PointPoolService } from '../point-pool.service';

@Controller('point-pool')
export class PointPoolUserController {
  constructor(private readonly pointPoolService: PointPoolService) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    return this.pointPoolService.findAll(+page, +limit, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointPoolService.findOne(id);
  }
}
