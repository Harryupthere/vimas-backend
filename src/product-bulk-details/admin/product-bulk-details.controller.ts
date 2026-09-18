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
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-bulk-details')
export class ProductBulkDetailsAdminController {
  constructor(
    private readonly productBulkDetailsService: ProductBulkDetailsService,
  ) {}

  @Post()
  @Permission('product-bulk-details.create')
  create(@Body() dto: CreateProductBulkDetailDto) {
    return this.productBulkDetailsService.create(dto);
  }

  @Get()
  @Permission('product-bulk-details.view')
  findAll(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.productBulkDetailsService.findAll(
      productId ? +productId : undefined,
      status !== undefined ? +status : undefined,
      search,
    );
  }

  @Get(':id')
  @Permission('product-bulk-details.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productBulkDetailsService.findOne(id);
  }

  @Patch(':id')
  @Permission('product-bulk-details.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductBulkDetailDto,
  ) {
    return this.productBulkDetailsService.update(id, dto);
  }

  @Delete(':id')
  @Permission('product-bulk-details.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productBulkDetailsService.remove(id);
  }
}
