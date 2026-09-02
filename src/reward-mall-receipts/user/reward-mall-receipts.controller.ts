import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RewardMallReceiptsService } from '../reward-mall-receipts.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

// Same `reward-mall-purchases` prefix/guard convention as
// RewardMallPurchasesUserController — kept in its own controller here since
// these endpoints live in the reward-mall-receipts module.
@UseGuards(JwtAuthGuard)
@Controller('reward-mall-purchases')
export class RewardMallReceiptsController {
  constructor(
    private readonly rewardMallReceiptsService: RewardMallReceiptsService,
  ) {}

  // Buyer: request receipt generation for one of their own redemptions.
  // Idempotent — see RewardMallReceiptsService.requestGeneration.
  @Post(':invoiceId/receipt/generate')
  generate(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    return this.rewardMallReceiptsService.requestGeneration(
      invoiceId,
      req.user.id,
    );
  }

  // Buyer: fetch a short-lived download URL for an already-generated
  // receipt. Does not trigger generation — that's the endpoint above (and
  // normally already triggered automatically once admin accepts the
  // redemption — see RewardMallPurchasesService.update).
  @Get(':invoiceId/receipt')
  download(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    return this.rewardMallReceiptsService.getDownloadUrl(
      invoiceId,
      req.user.id,
    );
  }
}
