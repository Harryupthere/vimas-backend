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
import { PaymentStatusService } from '../payment-status.service';
import { CreatePaymentStatusDto } from '../dto/create-payment-status.dto';
import { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/payment-status')
export class PaymentStatusAdminController {
  constructor(private readonly paymentStatusService: PaymentStatusService) {}

  @Post()
  @Permission('payment-status.create')
  create(@Body() dto: CreatePaymentStatusDto) {
    return this.paymentStatusService.create(dto);
  }

  @Get()
  @Permission('payment-status.view')
  findAll(@Query('search') search?: string) {
    return this.paymentStatusService.findAll(search);
  }

  @Get(':id')
  @Permission('payment-status.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentStatusService.findOne(id);
  }

  @Patch(':id')
  @Permission('payment-status.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentStatusService.update(id, dto);
  }

  @Delete(':id')
  @Permission('payment-status.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentStatusService.remove(id);
  }
}
