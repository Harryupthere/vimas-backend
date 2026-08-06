import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductMediaService } from '../product-media.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-media')
export class ProductMediaController {
  constructor(private readonly mediaService: ProductMediaService) {}

  @Get(':productId')
  findAll(@Param('productId', ParseIntPipe) productId: number) {
    return this.mediaService.findAll(productId);
  }
}
