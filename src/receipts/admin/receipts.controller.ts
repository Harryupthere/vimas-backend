import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReceiptsService } from '../receipts.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

// Same admin-auth convention as every other admin controller (e.g.
// src/orders/admin/orders.controller.ts): JwtAuthGuard + RolesGuard,
// gated with @Roles('admin').
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/receipts')
export class ReceiptsAdminController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.receiptsService.adminList(
      +page,
      +limit,
      status,
      sortOrder === 'ASC' ? 'ASC' : 'DESC',
    );
  }

  // Support/debugging detail view: the related order rows for this invoice,
  // plus the receipts row if one exists yet.
  @Get(':invoiceId')
  findOne(@Param('invoiceId') invoiceId: string) {
    return this.receiptsService.adminDetail(invoiceId);
  }
}
