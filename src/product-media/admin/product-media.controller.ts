import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductMediaService } from '../product-media.service';
import { CreateProductMediaDto } from '../dto/create-product-media.dto';
import { UpdateProductMediaDto } from '../dto/update-product-media.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-media')
export class ProductMediaAdminController {
  constructor(private readonly mediaService: ProductMediaService) {}

  @Post()
  @Permission('product-media.create')
  create(@Body() dto: CreateProductMediaDto) {
    return this.mediaService.create(dto);
  }

  @Put(':id')
  @Permission('product-media.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductMediaDto,
  ) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @Permission('product-media.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(id);
  }
}
