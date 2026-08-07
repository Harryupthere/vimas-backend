import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RewardMallProductsService } from '../reward-mall-products.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reward-mall-products')
export class RewardMallProductsUserController {
  constructor(
    private readonly rewardMallProductsService: RewardMallProductsService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.rewardMallProductsService.findAllUsers(
      +pageStr,
      +limitStr,
      categoryId ? +categoryId : undefined,
      req.user.id,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.rewardMallProductsService.findOneUsers(id, req.user.id);
  }
}
