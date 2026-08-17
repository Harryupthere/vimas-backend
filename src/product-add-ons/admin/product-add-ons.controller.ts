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
import { ProductAddOnsService } from '../product-add-ons.service';
import { CreateProductAddOnDto } from '../dto/create-product-add-on.dto';
import { UpdateProductAddOnDto } from '../dto/update-product-add-on.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { ProductType } from '../../shared/enums/product-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/product-add-ons')
export class ProductAddOnsAdminController {
  constructor(private readonly productAddOnsService: ProductAddOnsService) {}

  @Post()
  create(@Body() dto: CreateProductAddOnDto) {
    return this.productAddOnsService.create(dto);
  }

  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('productType') productType?: ProductType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.productAddOnsService.findAll(
      productId ? +productId : undefined,
      productType,
      isActive !== undefined ? +isActive : undefined,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productAddOnsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductAddOnDto,
  ) {
    return this.productAddOnsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productAddOnsService.remove(id);
  }
}
