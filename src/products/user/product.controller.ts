import {
  Controller,
  Get,
  Param,
  Body,
  Post,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ProductsService } from '../products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@Controller('products')
export class ProductsUserController {
  constructor(private readonly productsService: ProductsService) {}

  // Merchant APIs
  @UseGuards(JwtAuthGuard)
  @Post('merchant')
  createMerchant(@Req() req, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('merchant')
  findAllMerchant(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Req() req,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.productsService.findAllProducts(req.user.id, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('merchant/:id')
  findOneMerchant(@Req() req, @Param('id') id: number) {
    return this.productsService.findOneProduct(req.user.id, id);
  }

  // Buyer APIs
  @UseGuards(JwtAuthGuard)
  @Get()
  findAllUsers(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Req() req,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.productsService.findAllProductsUsers(page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOneUser(@Req() req, @Param('id') id: number) {
    return this.productsService.findOneProductUsers(id);
  }
}
