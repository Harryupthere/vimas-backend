import {
  Controller,
  Get,
  Body,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from '../products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class ProductsAdminController {
  constructor(private readonly productsService: ProductsService) {}

  // Admin adding a product directly — admin is the sole product creator now.
  // Scoped to admins only; every other route on this controller keeps its
  // existing JwtAuthGuard-only behavior.
  @Post('products')
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createByAdmin(dto);
  }

  @Get('products')
  findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('search') search?: string,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.productsService.findAll(page, limit, search);
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
