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
import { RewardMallPurchaseStatusService } from '../reward-mall-purchase-status.service';
import { CreateRewardMallPurchaseStatusDto } from '../dto/create-reward-mall-purchase-status.dto';
import { UpdateRewardMallPurchaseStatusDto } from '../dto/update-reward-mall-purchase-status.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/reward-mall-purchase-status')
export class RewardMallPurchaseStatusAdminController {
  constructor(
    private readonly statusService: RewardMallPurchaseStatusService,
  ) {}

  @Post()
  @Permission('reward-mall-purchase-status.create')
  create(@Body() dto: CreateRewardMallPurchaseStatusDto) {
    return this.statusService.create(dto);
  }

  @Get()
  @Permission('reward-mall-purchase-status.view')
  findAll(@Query('search') search?: string) {
    return this.statusService.findAll(search);
  }

  @Get(':id')
  @Permission('reward-mall-purchase-status.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.statusService.findOne(id);
  }

  @Patch(':id')
  @Permission('reward-mall-purchase-status.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallPurchaseStatusDto,
  ) {
    return this.statusService.update(id, dto);
  }

  @Delete(':id')
  @Permission('reward-mall-purchase-status.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.statusService.remove(id);
  }
}
