import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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

  @Post()
  create(@Body() dto: CreateProductPaymentOptionDto) {
    return this.ppoService.create(dto);
  }
}
