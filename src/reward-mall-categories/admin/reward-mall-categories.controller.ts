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
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/reward-mall-categories')
export class RewardMallCategoriesAdminController {
  constructor(
    private readonly rewardMallCategoriesService: RewardMallCategoriesService,
  ) {}

  @Post()
  @Permission('reward-mall-categories.create')
  create(@Body() dto: CreateRewardMallCategoryDto) {
    return this.rewardMallCategoriesService.create(dto);
  }

  @Get()
  @Permission('reward-mall-categories.view')
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.rewardMallCategoriesService.findAll(
      status !== undefined ? +status : undefined,
      search,
    );
  }

  @Get(':id')
  @Permission('reward-mall-categories.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallCategoriesService.findOne(id);
  }

  @Patch(':id')
  @Permission('reward-mall-categories.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallCategoryDto,
  ) {
    return this.rewardMallCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Permission('reward-mall-categories.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallCategoriesService.remove(id);
  }
}
