import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentStatusService } from '../payment-status.service';
import { CreatePaymentStatusDto } from '../dto/create-payment-status.dto';
import { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/payment-status')
export class PaymentStatusAdminController {
  constructor(private readonly paymentStatusService: PaymentStatusService) {}

  @Post()
  create(@Body() dto: CreatePaymentStatusDto) {
    return this.paymentStatusService.create(dto);
  }

  @Get()
  findAll() {
    return this.paymentStatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentStatusService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentStatusService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentStatusService.remove(id);
  }
}
