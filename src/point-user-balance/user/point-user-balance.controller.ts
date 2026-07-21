import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PointUserBalanceService } from '../point-user-balance.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('point-user-balance')
export class PointUserBalanceUserController {
  constructor(
    private readonly pointUserBalanceService: PointUserBalanceService,
  ) {}

  // "my wallet" — scoped to the logged-in buyer/merchant only, never a
  // generic list, since this is other users' financial data
  @Get()
  findMine(@Req() req: any) {
    return this.pointUserBalanceService.findMine(req.user.id);
  }
}
