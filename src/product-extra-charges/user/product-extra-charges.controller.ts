import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductExtraChargesService } from '../product-extra-charges.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { ProductType } from '../../shared/enums/product-type.enum';

@UseGuards(JwtAuthGuard)
@Controller('product-extra-charges')
export class ProductExtraChargesUserController {
  constructor(
    private readonly productExtraChargesService: ProductExtraChargesService,
  ) {}

  // Buyer: extra charges applicable to a product, scoped to the cart item's
  // product type — shown on the checkout page so the buyer can see these
  // auto-applied charges (e.g. processing fee) before paying. Optionally
  // narrowed to the payment option the buyer has selected.
  @Get('product/:productId')
  findAvailableForProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('productType') productType?: ProductType,
    @Query('paymentOptionId') paymentOptionId?: string,
  ) {
    if (!productType || !Object.values(ProductType).includes(productType)) {
      throw new BadRequestException(
        'A valid productType query param (CONSUMER, RESELLER or PARTNER) is required',
      );
    }
    return this.productExtraChargesService.findAvailableForProduct(
      productId,
      productType,
      paymentOptionId ? +paymentOptionId : undefined,
    );
  }
}
