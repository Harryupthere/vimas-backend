import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { AdminUpdateOrderDto } from '../dto/admin-update-order.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Permission('orders.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.ordersService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Permission('orders.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Get('snapshots/:id')
  @Permission('orders.view')
  getOrderSnapshot(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderSnapshot(id);
  }

  @Patch(':id/status')
  @Permission('orders.update')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateOrderDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }
}
