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
import { ProductCouponsService } from '../product-coupons.service';
import { CreateProductCouponDto } from '../dto/create-product-coupon.dto';
import { UpdateProductCouponDto } from '../dto/update-product-coupon.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { ProductType } from '../../shared/enums/product-type.enum';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-coupons')
export class ProductCouponsAdminController {
  constructor(private readonly productCouponsService: ProductCouponsService) {}

  @Post()
  @Permission('product-coupons.create')
  create(@Body() dto: CreateProductCouponDto) {
    return this.productCouponsService.create(dto);
  }

  @Get()
  @Permission('product-coupons.view')
  findAll(
    @Query('productId') productId?: string,
    @Query('productType') productType?: ProductType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.productCouponsService.findAll(
      productId ? +productId : undefined,
      productType,
      isActive !== undefined ? +isActive : undefined,
      search,
    );
  }

  @Get(':id')
  @Permission('product-coupons.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productCouponsService.findOne(id);
  }

  @Patch(':id')
  @Permission('product-coupons.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductCouponDto,
  ) {
    return this.productCouponsService.update(id, dto);
  }

  @Delete(':id')
  @Permission('product-coupons.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productCouponsService.remove(id);
  }
}
