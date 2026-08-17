import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductDiscountsService } from '../product-discounts.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { ProductType } from '../../shared/enums/product-type.enum';

@UseGuards(JwtAuthGuard)
@Controller('product-discounts')
export class ProductDiscountsUserController {
  constructor(
    private readonly productDiscountsService: ProductDiscountsService,
  ) {}

  // Buyer: automatic discounts available for a product, scoped to the cart
  // item's product type — shown on the checkout page so the buyer can see
  // what discount will apply before paying (these are never opt-in).
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
    return this.productDiscountsService.findAvailableForProduct(
      productId,
      productType,
    );
  }
}
