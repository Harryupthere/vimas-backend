import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RewardMallPurchasesService } from '../reward-mall-purchases.service';
import { AdminUpdateRewardMallPurchaseDto } from '../dto/admin-update-reward-mall-purchase.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/reward-mall-purchases')
export class RewardMallPurchasesAdminController {
  constructor(
    private readonly rewardMallPurchasesService: RewardMallPurchasesService,
  ) {}

  @Get()
  @Permission('reward-mall-purchases.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('userId') userId?: string,
    @Query('statusId') statusId?: string,
    @Query('search') search?: string,
  ) {
    return this.rewardMallPurchasesService.findAll(+page, +limit, {
      userId: userId ? +userId : undefined,
      statusId: statusId ? +statusId : undefined,
      search,
    });
  }

  @Get(':id')
  @Permission('reward-mall-purchases.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rewardMallPurchasesService.findOne(id);
  }

  @Patch(':id')
  @Permission('reward-mall-purchases.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateRewardMallPurchaseDto,
  ) {
    return this.rewardMallPurchasesService.update(id, dto);
  }
}
