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
import { RewardMallProductsService } from '../reward-mall-products.service';
import { CreateRewardMallProductDto } from '../dto/create-reward-mall-product.dto';
import { UpdateRewardMallProductDto } from '../dto/update-reward-mall-product.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/reward-mall-products')
export class RewardMallProductsAdminController {
  constructor(
    private readonly rewardMallProductsService: RewardMallProductsService,
  ) {}

  @Post()
  @Permission('reward-mall-products.create')
  create(@Body() dto: CreateRewardMallProductDto) {
    return this.rewardMallProductsService.create(dto);
  }

  @Get()
  @Permission('reward-mall-products.view')
  findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.rewardMallProductsService.findAll(
      +pageStr,
      +limitStr,
      categoryId ? +categoryId : undefined,
      status !== undefined ? +status : undefined,
      search,
    );
  }

  @Get(':id')
  @Permission('reward-mall-products.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallProductsService.findOne(id);
  }

  @Patch(':id')
  @Permission('reward-mall-products.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallProductDto,
  ) {
    return this.rewardMallProductsService.update(id, dto);
  }

  @Delete(':id')
  @Permission('reward-mall-products.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallProductsService.remove(id);
  }
}
