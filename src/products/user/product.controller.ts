import { Controller, Get, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ProductsService } from '../products.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@Controller('products')
export class ProductsUserController {
  constructor(private readonly productsService: ProductsService) {}

  // Buyer APIs — admin is the sole product creator now (no merchant flow)
  // type=reseller/consumer/partner restricts results to products opted
  // into the matching catalog (bulk_available/consumer_available/
  // partner_available = 1 respectively); omitted/any other value returns
  // the full catalog.
  @UseGuards(JwtAuthGuard)
  @Get()
  findAllUsers(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('type') type: string,
    @Query('search') search: string,
    @Req() req,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.productsService.findAllProductsUsers(page, limit, type, search);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOneUser(
    @Req() req,
    @Param('id') id: number,
    @Query('type') type: string,
  ) {
    return this.productsService.findOneProductUsers(id, req.user.id, type);
  }
}
