import {
  Controller,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  ParseIntPipe,
  Body,
  Post,
  Delete,
} from '@nestjs/common';
import { ProductActionsService } from '../product-action.service';
import { AdminUpdateProductActionDto } from '../dto/admin-update-product-action.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-actions')
export class ProductActionsAdminController {
  constructor(private readonly paService: ProductActionsService) {}

  // list (optional filters)
  @Get()
  @Permission('product-actions.view')
  list(@Query('status') status?: number, @Query('stage') stage?: number) {
    const filters: any = {};
    if (status !== undefined) filters.status = Number(status);
    if (stage !== undefined) filters.stage = Number(stage);
    return this.paService.adminList(filters);
  }

  // get single
  @Get(':id')
  @Permission('product-actions.view')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.paService.findOne(id);
  }

  // admin update action (approve/reject/add remarks)
  @Patch(':id')
  @Permission('product-actions.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateProductActionDto,
  ) {
    return this.paService.adminUpdate(id, dto);
  }

  // remove
  @Delete(':id')
  @Permission('product-actions.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paService.remove(id);
  }
}
