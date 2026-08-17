import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductAddOnsService } from '../product-add-ons.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { ProductType } from '../../shared/enums/product-type.enum';

@UseGuards(JwtAuthGuard)
@Controller('product-add-ons')
export class ProductAddOnsUserController {
  constructor(private readonly productAddOnsService: ProductAddOnsService) {}

  // Buyer: add-ons available for a product, scoped to the cart item's
  // product type (consumer/reseller/partner) — shown on the checkout page
  // so the buyer can opt into any of them before paying.
  @Get('product/:productId')
  findAvailableForProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('productType') productType?: ProductType,
  ) {
    if (!productType || !Object.values(ProductType).includes(productType)) {
      throw new BadRequestException(
        'A valid productType query param (CONSUMER, RESELLER or PARTNER) is required',
      );
    }
    return this.productAddOnsService.findAvailableForProduct(
      productId,
      productType,
    );
  }
}
