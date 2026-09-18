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
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/reward-mall-product-media')
export class RewardMallProductMediaAdminController {
  constructor(private readonly mediaService: RewardMallProductMediaService) {}

  @Post()
  @Permission('reward-mall-product-media.create')
  create(@Body() dto: CreateRewardMallProductMediaDto) {
    return this.mediaService.create(dto);
  }

  @Patch(':id')
  @Permission('reward-mall-product-media.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallProductMediaDto,
  ) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @Permission('reward-mall-product-media.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(id);
  }
}
