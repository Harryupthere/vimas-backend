import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
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
  ) {
    return this.ordersService.findMyOrders(req.user.id, +page, +limit);
  }

  @Get('my/:id')
  findMyOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findMyOrder(req.user.id, id);
  }

  // Merchant: list orders containing their own products
  @Get('merchant')
  findMerchantOrders(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.ordersService.findMerchantOrders(req.user.id, +page, +limit);
  }

  // Merchant: update order status only (e.g. Shipped/Delivered) for their own orders
  @Patch('merchant/:id/status')
  updateOrderStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(req.user.id, id, dto);
  }
}
