import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Buyer: checkout entire cart via Stripe
  @Post('checkout')
  checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(req.user.id, dto);
  }

  // Buyer: checkout-page pricing preview — extra charges, add-ons,
  // discounts, coupons (one per product, if provided), and wallet info,
  // all calculated server-side from the current cart. No order/snapshot
  // is written.
  @Get('checkout/pricing')
  previewCheckoutPricing(
    @Req() req: any,
    @Query('couponCodes') couponCodes?: string,
    @Query('addOnIds') addOnIds?: string,
    @Query('useWallet') useWallet?: string,
    @Query('paymentOptionId') paymentOptionId?: string,
  ) {
    return this.ordersService.previewCheckoutPricing(req.user.id, {
      couponCodes: couponCodes
        ? couponCodes
            .split(',')
            .map((code) => code.trim())
            .filter((code) => !!code)
        : undefined,
      addOnIds: addOnIds
        ? addOnIds
            .split(',')
            .map((id) => +id)
            .filter((id) => !Number.isNaN(id))
        : undefined,
      useWallet: useWallet === 'true',
      paymentOptionId: paymentOptionId ? +paymentOptionId : undefined,
    });
  }

  // Buyer: poll payment/order status by Stripe session id (frontend redirect callback)
  @Get('status')
  getStatus(@Req() req: any, @Query('sessionId') sessionId: string) {
    return this.ordersService.getStatusBySessionId(req.user.id, sessionId);
  }

  @Get('my')
  findMyOrders(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.ordersService.findMyOrders(req.user.id, +page, +limit, search);
  }

  @Get('my/:id')
  findMyOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findMyOrder(req.user.id, id);
  }

  @Get('snapshots/:id')
  getMyOrderSnapshot(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getMyOrderSnapshot(req.user.id, id);
  }
}
