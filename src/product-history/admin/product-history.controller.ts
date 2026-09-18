import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductHistoryService } from '../product-history.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-history')
export class ProductHistoryAdminController {
  constructor(private readonly productHistoryService: ProductHistoryService) {}

  @Get()
  @Permission('product-history.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
  ) {
    return this.productHistoryService.findAll(
      +page,
      +limit,
      productId ? +productId : undefined,
    );
  }

  @Get(':id')
  @Permission('product-history.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productHistoryService.findOne(id);
  }
}
