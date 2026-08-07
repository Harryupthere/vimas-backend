import {
  Controller,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductViewsService } from '../product-views.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-views')
export class ProductViewsController {
  constructor(private readonly productViewsService: ProductViewsService) {}

  @Post(':productId')
  recordView(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productViewsService.recordView(req.user.id, productId);
  }
}
