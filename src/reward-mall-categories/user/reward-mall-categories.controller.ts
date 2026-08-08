import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RewardMallCategoriesService } from '../reward-mall-categories.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reward-mall-categories')
export class RewardMallCategoriesUserController {
  constructor(
    private readonly rewardMallCategoriesService: RewardMallCategoriesService,
  ) {}

  // Buyers only ever browse active categories
  @Get()
  findAll(@Query('search') search?: string) {
    return this.rewardMallCategoriesService.findAll(1, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallCategoriesService.findOne(id);
  }
}
