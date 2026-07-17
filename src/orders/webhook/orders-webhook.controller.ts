import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from '../orders.service';

@Controller('orders')
export class OrdersWebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  // No guards: Stripe calls this directly. Signature verification (via
  // stripe-signature header + raw body) is what authenticates the request.
  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log("Stripe called")
    if (!signature) {
      console.log('Missing stripe-signature header')
      throw new BadRequestException('Missing stripe-signature header');
    }
    return this.ordersService.handleStripeWebhook(
      req.body as Buffer,
      signature,
    );
  }
}
