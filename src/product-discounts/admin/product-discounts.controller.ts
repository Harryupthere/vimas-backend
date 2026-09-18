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
import { ProductDiscountsService } from '../product-discounts.service';
import { CreateProductDiscountDto } from '../dto/create-product-discount.dto';
import { UpdateProductDiscountDto } from '../dto/update-product-discount.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { ProductType } from '../../shared/enums/product-type.enum';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-discounts')
export class ProductDiscountsAdminController {
  constructor(
    private readonly productDiscountsService: ProductDiscountsService,
  ) {}

  @Post()
  @Permission('product-discounts.create')
  create(@Body() dto: CreateProductDiscountDto) {
    return this.productDiscountsService.create(dto);
  }

  @Get()
  @Permission('product-discounts.view')
  findAll(
    @Query('productId') productId?: string,
    @Query('productType') productType?: ProductType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.productDiscountsService.findAll(
      productId ? +productId : undefined,
      productType,
      isActive !== undefined ? +isActive : undefined,
      search,
    );
  }

  @Get(':id')
  @Permission('product-discounts.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productDiscountsService.findOne(id);
  }

  @Patch(':id')
  @Permission('product-discounts.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDiscountDto,
  ) {
    return this.productDiscountsService.update(id, dto);
  }

  @Delete(':id')
  @Permission('product-discounts.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productDiscountsService.remove(id);
  }
}
