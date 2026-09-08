import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Get
} from '@nestjs/common';
import { ProductPaymentOptionService } from '../product-payment-option.service';
import { CreateProductPaymentOptionDto } from '../dto/create-product-payment-option.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/product-payment-option')
export class ProductPaymentOptionAdminController {
  constructor(private readonly ppoService: ProductPaymentOptionService) {}
 @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ppoService.findAll(id);
  }
  @Post()
  create(@Body() dto: CreateProductPaymentOptionDto) {
    return this.ppoService.create(dto);
  }

  // :id is the product_payment_options row's own id, not the product id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ppoService.remove(id);
  }
}
