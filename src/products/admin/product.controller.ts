import {
  Controller,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from '../products.service';
import { UpdateProductDto } from '../dto/update-product.dto';

@Controller('admin')
export class ProductsAdminController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.productsService.findAll(page, limit);
  }

  @Get('products/:id')
  findOne(@Param('id') id: number) {
    return this.productsService.findOne(id);
  }

  @Patch('products/:id')
  update(@Param('id') id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('products/:id')
  remove(@Param('id') id: number) {
    return this.productsService.remove(id);
  }
}
