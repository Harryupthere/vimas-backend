import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RewardMallPurchasesService } from '../reward-mall-purchases.service';
import { CreateRewardMallPurchaseDto } from '../dto/create-reward-mall-purchase.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reward-mall-purchases')
export class RewardMallPurchasesUserController {
  constructor(
    private readonly rewardMallPurchasesService: RewardMallPurchasesService,
  ) {}

  // Redeem points for a reward mall product — checks the buyer's current
  // point balance before debiting it.
  @Post()
  purchase(@Req() req: any, @Body() dto: CreateRewardMallPurchaseDto) {
    return this.rewardMallPurchasesService.purchase(req.user.id, dto);
  }

  @Get('my')
  findMine(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.rewardMallPurchasesService.findMine(
      req.user.id,
      +page,
      +limit,
      search,
    );
  }

  @Get('my/:id')
  findMineOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.rewardMallPurchasesService.findMineOne(req.user.id, id);
  }
}
