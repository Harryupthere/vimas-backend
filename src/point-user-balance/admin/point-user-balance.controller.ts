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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/point-user-balance')
export class PointUserBalanceAdminController {
  constructor(
    private readonly pointUserBalanceService: PointUserBalanceService,
  ) {}

  @Post()
  create(@Body() dto: CreatePointUserBalanceDto) {
    return this.pointUserBalanceService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.pointUserBalanceService.findAll(+page, +limit, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointUserBalanceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointUserBalanceDto,
  ) {
    return this.pointUserBalanceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointUserBalanceService.remove(id);
  }
}
