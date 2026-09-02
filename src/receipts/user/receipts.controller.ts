import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReceiptsService } from '../receipts.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

// Same `orders` prefix/guard convention as OrdersController
// (src/orders/user/orders.controller.ts) — kept in its own controller here
// since the receipt endpoints live in the receipts module, not orders.
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  // Buyer: request receipt generation for one of their own invoices.
  // Idempotent — see ReceiptsService.requestGeneration for the
  // pending/generated/failed handling.
  @Post(':invoiceId/receipt/generate')
  generate(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    return this.receiptsService.requestGeneration(invoiceId, req.user.id);
  }

  // Buyer: fetch a short-lived download URL for an already-generated
  // receipt. Does not trigger generation — that's the endpoint above.
  @Get(':invoiceId/receipt')
  download(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    return this.receiptsService.getDownloadUrl(invoiceId, req.user.id);
  }
}
