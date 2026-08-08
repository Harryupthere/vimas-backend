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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/reward-mall-products')
export class RewardMallProductsAdminController {
  constructor(
    private readonly rewardMallProductsService: RewardMallProductsService,
  ) {}

  @Post()
  create(@Body() dto: CreateRewardMallProductDto) {
    return this.rewardMallProductsService.create(dto);
  }

  @Get()
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallProductsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallProductDto,
  ) {
    return this.rewardMallProductsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallProductsService.remove(id);
  }
}
