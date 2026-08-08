import { Controller, Get, Query } from '@nestjs/common';
import { RewardMallProductsService } from '../reward-mall-products.service';

// Public listing — no auth required, so there's no req.user to scope
// purchasedQuantity/maxPurchaseReached against. findAllUsers already treats
// userId as optional and falls back those fields to 0/false in that case,
// so this just calls it with userId omitted.
@Controller('public/reward-mall-products')
export class RewardMallProductsPublicController {
  constructor(
    private readonly rewardMallProductsService: RewardMallProductsService,
  ) {}

  @Get()
  findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.rewardMallProductsService.findAllUsers(
      +pageStr,
      +limitStr,
      categoryId ? +categoryId : undefined,
      undefined,
      search,
    );
  }
}
