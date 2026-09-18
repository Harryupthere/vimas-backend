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
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-payment-option')
export class ProductPaymentOptionAdminController {
  constructor(private readonly ppoService: ProductPaymentOptionService) {}
 @Get(':id')
  @Permission('product-payment-option.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ppoService.findAll(id);
  }
  @Post()
  @Permission('product-payment-option.create')
  create(@Body() dto: CreateProductPaymentOptionDto) {
    return this.ppoService.create(dto);
  }

  // :id is the product_payment_options row's own id, not the product id
  @Delete(':id')
  @Permission('product-payment-option.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ppoService.remove(id);
  }
}
