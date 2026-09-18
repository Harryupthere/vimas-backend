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
import { OrderStatusService } from '../order-status.service';
import { CreateOrderStatusDto } from '../dto/create-order-status.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/order-status')
export class OrderStatusAdminController {
  constructor(private readonly orderStatusService: OrderStatusService) {}

  @Post()
  @Permission('order-status.create')
  create(@Body() dto: CreateOrderStatusDto) {
    return this.orderStatusService.create(dto);
  }

  @Get()
  @Permission('order-status.view')
  findAll() {
    return this.orderStatusService.findAll();
  }

  @Get(':id')
  @Permission('order-status.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderStatusService.findOne(id);
  }

  @Patch(':id')
  @Permission('order-status.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderStatusService.update(id, dto);
  }

  @Delete(':id')
  @Permission('order-status.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderStatusService.remove(id);
  }
}
