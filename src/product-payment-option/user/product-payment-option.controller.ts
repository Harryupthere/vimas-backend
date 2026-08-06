import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductPaymentOptionService } from '../product-payment-option.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-payment-option')
export class ProductPaymentOptionController {
  constructor(private readonly ppoService: ProductPaymentOptionService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ppoService.findOne(id);
  }
}
