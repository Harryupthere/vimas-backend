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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/product-extra-charges')
export class ProductExtraChargesAdminController {
  constructor(
    private readonly productExtraChargesService: ProductExtraChargesService,
  ) {}

  @Post()
  create(@Body() dto: CreateProductExtraChargeDto) {
    return this.productExtraChargesService.create(dto);
  }

  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('productType') productType?: ProductType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.productExtraChargesService.findAll(
      productId ? +productId : undefined,
      productType,
      isActive !== undefined ? +isActive : undefined,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productExtraChargesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductExtraChargeDto,
  ) {
    return this.productExtraChargesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productExtraChargesService.remove(id);
  }
}
