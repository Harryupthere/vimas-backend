import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RewardMallProductMediaService } from '../reward-mall-product-media.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reward-mall-product-media')
export class RewardMallProductMediaUserController {
  constructor(private readonly mediaService: RewardMallProductMediaService) {}

  @Get(':productId')
  findAll(@Param('productId', ParseIntPipe) productId: number) {
    return this.mediaService.findAll(productId);
  }
}
