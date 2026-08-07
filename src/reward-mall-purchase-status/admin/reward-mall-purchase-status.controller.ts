import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RewardMallPurchaseStatusService } from '../reward-mall-purchase-status.service';
import { CreateRewardMallPurchaseStatusDto } from '../dto/create-reward-mall-purchase-status.dto';
import { UpdateRewardMallPurchaseStatusDto } from '../dto/update-reward-mall-purchase-status.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/reward-mall-purchase-status')
export class RewardMallPurchaseStatusAdminController {
  constructor(
    private readonly statusService: RewardMallPurchaseStatusService,
  ) {}

  @Post()
  create(@Body() dto: CreateRewardMallPurchaseStatusDto) {
    return this.statusService.create(dto);
  }

  @Get()
  findAll() {
    return this.statusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.statusService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardMallPurchaseStatusDto,
  ) {
    return this.statusService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.statusService.remove(id);
  }
}
