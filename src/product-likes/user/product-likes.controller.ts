import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductLikesService } from '../product-likes.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-likes')
export class ProductLikesController {
  constructor(private readonly productLikesService: ProductLikesService) {}

  // Like if not liked yet, unlike if already liked
  @Post(':productId/toggle')
  toggle(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.productLikesService.toggle(req.user.id, productId);
  }

  @Get(':productId/status')
  getStatus(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productLikesService.getStatus(req.user.id, productId);
  }
}
