import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RewardMallProductMediaService } from '../reward-mall-product-media.service';
import { CreateRewardMallProductMediaDto } from '../dto/create-reward-mall-product-media.dto';
import { UpdateRewardMallProductMediaDto } from '../dto/update-reward-mall-product-media.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/reward-mall-product-media')
export class RewardMallProductMediaAdminController {
  constructor(private readonly mediaService: RewardMallProductMediaService) {}

  @Post()
  create(@Body() dto: CreateRewardMallProductMediaDto) {
    return this.mediaService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallProductMediaDto,
  ) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(id);
  }
}
