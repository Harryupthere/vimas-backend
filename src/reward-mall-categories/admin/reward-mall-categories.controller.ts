import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RewardMallCategoriesService } from '../reward-mall-categories.service';
import { CreateRewardMallCategoryDto } from '../dto/create-reward-mall-category.dto';
import { UpdateRewardMallCategoryDto } from '../dto/update-reward-mall-category.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/reward-mall-categories')
export class RewardMallCategoriesAdminController {
  constructor(
    private readonly rewardMallCategoriesService: RewardMallCategoriesService,
  ) {}

  @Post()
  create(@Body() dto: CreateRewardMallCategoryDto) {
    return this.rewardMallCategoriesService.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.rewardMallCategoriesService.findAll(
      status !== undefined ? +status : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallCategoryDto,
  ) {
    return this.rewardMallCategoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallCategoriesService.remove(id);
  }
}
