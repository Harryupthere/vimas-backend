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
    console.log('Stripe called');
    if (!signature) {
      console.log('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }
    return this.ordersService.handleStripeWebhook(
      req.body as Buffer,
      signature,
    );
  }

  // No guards: CoinPayments calls this directly. Signature verification
  // (via x-coinpayments-signature header + raw body) is what authenticates
  // the request — see main.ts for the raw-body parsing this route needs.
  @Post('webhook/coinpayments')
  async handleCoinPaymentsWebhook(
    @Req() req: Request,
    @Headers('x-coinpayments-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-coinpayments-signature header');
    }
    return this.ordersService.handleCoinPaymentsWebhook(
      req.body as Buffer,
      signature,
    );
  }
}
