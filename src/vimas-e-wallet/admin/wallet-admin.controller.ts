import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VimasEWalletService } from '../vimas-e-wallet.service';
import { CreditWalletDto } from '../dto/credit-wallet.dto';
import { DebitWalletDto } from '../dto/debit-wallet.dto';
import { UpdateWalletStatusDto } from '../dto/update-wallet-status.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/wallet')
export class WalletAdminController {
  constructor(private readonly walletService: VimasEWalletService) {}

  @Get()
  @Permission('wallet.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.walletService.findAllWallets(+page, +limit, search);
  }

  @Get(':userId')
  @Permission('wallet.view')
  getBalance(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getBalance(userId);
  }

  @Get(':userId/transactions')
  @Permission('wallet.view')
  findTransactions(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.walletService.findTransactions(userId, +page, +limit);
  }

  @Patch(':userId/status')
  @Permission('wallet.update')
  setStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateWalletStatusDto,
  ) {
    return this.walletService.setStatus(userId, dto.isActive);
  }

  @Post(':userId/credit')
  @Permission('wallet.credit')
  credit(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreditWalletDto,
  ) {
    return this.walletService.credit(userId, dto);
  }

  @Post(':userId/debit')
  @Permission('wallet.debit')
  debit(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: DebitWalletDto,
  ) {
    return this.walletService.debit(userId, dto);
  }
}
