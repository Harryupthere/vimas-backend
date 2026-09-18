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
import { ProductExtraChargesService } from '../product-extra-charges.service';
import { CreateProductExtraChargeDto } from '../dto/create-product-extra-charge.dto';
import { UpdateProductExtraChargeDto } from '../dto/update-product-extra-charge.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { ProductType } from '../../shared/enums/product-type.enum';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-extra-charges')
export class ProductExtraChargesAdminController {
  constructor(
    private readonly productExtraChargesService: ProductExtraChargesService,
  ) {}

  @Post()
  @Permission('product-extra-charges.create')
  create(@Body() dto: CreateProductExtraChargeDto) {
    return this.productExtraChargesService.create(dto);
  }

  @Get()
  @Permission('product-extra-charges.view')
  findAll(
    @Query('productId') productId?: string,
    @Query('productType') productType?: ProductType,
    @Query('paymentOptionId') paymentOptionId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.productExtraChargesService.findAll(
      productId ? +productId : undefined,
      productType,
      paymentOptionId ? +paymentOptionId : undefined,
      isActive !== undefined ? +isActive : undefined,
      search,
    );
  }

  @Get(':id')
  @Permission('product-extra-charges.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productExtraChargesService.findOne(id);
  }

  @Patch(':id')
  @Permission('product-extra-charges.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductExtraChargeDto,
  ) {
    return this.productExtraChargesService.update(id, dto);
  }

  @Delete(':id')
  @Permission('product-extra-charges.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productExtraChargesService.remove(id);
  }
}
