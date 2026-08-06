import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductBulkDetailsService } from '../product-bulk-details.service';
import { CreateProductBulkDetailDto } from '../dto/create-product-bulk-detail.dto';
import { UpdateProductBulkDetailDto } from '../dto/update-product-bulk-detail.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/product-bulk-details')
export class ProductBulkDetailsAdminController {
  constructor(
    private readonly productBulkDetailsService: ProductBulkDetailsService,
  ) {}

  @Post()
  create(@Body() dto: CreateProductBulkDetailDto) {
    return this.productBulkDetailsService.create(dto);
  }

  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    return this.productBulkDetailsService.findAll(
      productId ? +productId : undefined,
      status !== undefined ? +status : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productBulkDetailsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductBulkDetailDto,
  ) {
    return this.productBulkDetailsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productBulkDetailsService.remove(id);
  }
}
