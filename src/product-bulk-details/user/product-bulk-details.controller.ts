import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductBulkDetailsService } from '../product-bulk-details.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-bulk-details')
export class ProductBulkDetailsUserController {
  constructor(
    private readonly productBulkDetailsService: ProductBulkDetailsService,
  ) {}

  // Package picker — package_quantity + unit_price (+ id) for a product
  @Get('product/:productId')
  findPackagesForProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.productBulkDetailsService.findPackagesForProduct(productId);
  }

  // Full details for one package the buyer picked, scoped to the product
  @Get('product/:productId/:id')
  findOneForProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productBulkDetailsService.findOneForProduct(productId, id);
  }
}
