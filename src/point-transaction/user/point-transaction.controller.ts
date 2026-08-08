import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { PointTransactionService } from '../point-transaction.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('point-transaction')
export class PointTransactionUserController {
  constructor(
    private readonly pointTransactionService: PointTransactionService,
  ) {}

  // "my point history" — scoped to the logged-in buyer/merchant's own USER
  // wallet only, never a generic list (other users' ledgers are private)
  @Get('my')
  findMine(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.pointTransactionService.findMine(
      req.user.id,
      +page,
      +limit,
      search,
    );
  }

  @Post('orders')
  findOtherTransactionWithOrderId(
    @Req() req: any,
    @Body() body: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.pointTransactionService.findOtherTransactionWithOrderId(
      req.user.id,
      req.body.orderId,
      +page,
      +limit,
    );
  }

  // Must stay above 'my/:id' — otherwise ':id' would greedily match
  // "downline-tree" as a param value.
  @Get('my/downline-tree')
  getDownlineTree(@Req() req: any) {
    return this.pointTransactionService.getDownlineTree(req.user.id);
  }

  @Get('my/:id')
  findMineOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.pointTransactionService.findMineOne(req.user.id, id);
  }
}
