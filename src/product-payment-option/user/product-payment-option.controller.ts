import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductPaymentOptionService } from '../product-payment-option.service';
import { CreateProductPaymentOptionDto } from '../dto/create-product-payment-option.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@Controller('product-payment-option')
export class ProductPaymentOptionController {
  constructor(private readonly ppoService: ProductPaymentOptionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateProductPaymentOptionDto) {
    return this.ppoService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ppoService.findOne(id);
  }
}
