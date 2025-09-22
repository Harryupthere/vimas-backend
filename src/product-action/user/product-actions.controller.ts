import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { ProductActionsService } from '../product-action.service';
import { CreateProductActionDto } from '../dto/create-product-action.dto';
import { MerchantUpdateProductActionDto } from '../dto/merchant-update-product-action.dto';

@UseGuards(JwtAuthGuard)
@Controller('product-actions')
export class ProductActionsUserController {
  constructor(private readonly paService: ProductActionsService) {}

  // merchant creates a request
  @Post()
  create(@Req() req: any, @Body() dto: CreateProductActionDto) {
    // NOTE: req.user should contain merchant id (e.g. req.user.userId)
    const merchantId = req.user?.id;
    return this.paService.create(merchantId, dto);
  }

  // get actions for a product (any authenticated user who has access)
  @Get('product/:productId')
  findByProduct(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const merchantId = req.user?.id;
    return this.paService.findByProduct(merchantId, productId);
  }

  // merchant: get actions for all his products
  @Get('my')
  myActions(@Req() req: any) {
    const merchantId = req.user?.id;
    return this.paService.findByMerchant(merchantId);
  }

  // merchant adds remarks to an existing action
  @Patch(':id/merchant-remarks')
  addMerchantRemarks(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MerchantUpdateProductActionDto,
  ) {
    const merchantId = req.user?.id;
    return this.paService.merchantAddRemarks(id, merchantId, dto);
  }
}
