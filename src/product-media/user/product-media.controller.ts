import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductMediaService } from '../product-media.service';
import { CreateProductMediaDto } from '../dto/create-product-media.dto';
import { UpdateProductMediaDto } from '../dto/update-product-media.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@Controller('product-media')
export class ProductMediaController {
  constructor(private readonly mediaService: ProductMediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateProductMediaDto) {
    return this.mediaService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':productId')
  findAll(@Param('productId', ParseIntPipe) productId: number) {
    return this.mediaService.findAll(productId);
  }
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductMediaDto,
  ) {
    return this.mediaService.update(req.user.id, id, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(req.user.id, id);
  }
}
