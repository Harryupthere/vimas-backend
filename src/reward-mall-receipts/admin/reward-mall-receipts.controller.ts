import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RewardMallReceiptsService } from '../reward-mall-receipts.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/reward-mall-receipts')
export class RewardMallReceiptsAdminController {
  constructor(
    private readonly rewardMallReceiptsService: RewardMallReceiptsService,
  ) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.rewardMallReceiptsService.adminList(
      +page,
      +limit,
      status,
      sortOrder === 'ASC' ? 'ASC' : 'DESC',
    );
  }

  // Support/debugging detail view: the related reward mall purchase for
  // this invoice, plus the receipts row if one exists yet.
  @Get(':invoiceId')
  findOne(@Param('invoiceId') invoiceId: string) {
    return this.rewardMallReceiptsService.adminDetail(invoiceId);
  }
}
