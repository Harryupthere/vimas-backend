import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentOptionsService } from '../payment-option.service';
import { CreatePaymentOptionDto } from '../dto/create-payment-option.dto';
import { UpdatePaymentOptionDto } from '../dto/update-payment-option.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin')
export class PaymentOptionsController {
  constructor(private readonly paymentOptionsService: PaymentOptionsService) {}

  @Post('payment-options')
  @Permission('payment-options.create')
  create(@Body() dto: CreatePaymentOptionDto) {
    return this.paymentOptionsService.create(dto);
  }

  @Get('payment-options')
  @Permission('payment-options.view')
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.paymentOptionsService.findAll(
      search,
      status !== undefined ? +status : undefined,
    );
  }

  @Get('payment-options/:id')
  @Permission('payment-options.view')
  findOne(@Param('id') id: number) {
    return this.paymentOptionsService.findOne(id);
  }

  @Put('payment-options/:id')
  @Permission('payment-options.update')
  update(@Param('id') id: number, @Body() dto: UpdatePaymentOptionDto) {
    return this.paymentOptionsService.update(id, dto);
  }

  @Delete('payment-options/:id')
  @Permission('payment-options.delete')
  remove(@Param('id') id: number) {
    return this.paymentOptionsService.remove(id);
  }
}
