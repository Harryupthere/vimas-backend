import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { VimasEWalletService } from '../vimas-e-wallet.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: VimasEWalletService) {}

  @Get()
  getMyBalance(@Req() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('transactions')
  findMyTransactions(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.walletService.findTransactions(req.user.id, +page, +limit);
  }
}
