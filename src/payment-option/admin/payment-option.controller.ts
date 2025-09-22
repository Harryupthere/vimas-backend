import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  //UseGuards,
} from '@nestjs/common';
import { PaymentOptionsService } from '../payment-option.service';
import { CreatePaymentOptionDto } from '../dto/create-payment-option.dto';

@Controller('admin')
export class PaymentOptionsController {
  constructor(private readonly paymentOptionsService: PaymentOptionsService) {}

  @Post('payment-options')
  create(@Body() dto: CreatePaymentOptionDto) {
    return this.paymentOptionsService.create(dto);
  }

  @Get('payment-options')
  findAll() {
    return this.paymentOptionsService.findAll();
  }

  @Get('payment-options/:id')
  findOne(@Param('id') id: number) {
    return this.paymentOptionsService.findOne(id);
  }

  @Put('payment-options/:id')
  update(@Param('id') id: number, @Body() dto: any) {
    return this.paymentOptionsService.update(id, dto);
  }

  @Delete('payment-options/:id')
  remove(@Param('id') id: number) {
    return this.paymentOptionsService.remove(id);
  }
}
