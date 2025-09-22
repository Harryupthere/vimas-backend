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

@Controller('admin/product-actions')
export class ProductActionsAdminController {
  constructor(private readonly paService: ProductActionsService) {}

  // list (optional filters)
  @Get()
  list(@Query('status') status?: number, @Query('stage') stage?: number) {
    const filters: any = {};
    if (status !== undefined) filters.status = Number(status);
    if (stage !== undefined) filters.stage = Number(stage);
    return this.paService.adminList(filters);
  }

  // get single
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.paService.findOne(id);
  }

  // admin update action (approve/reject/add remarks)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateProductActionDto,
  ) {
    return this.paService.adminUpdate(id, dto);
  }

  // remove
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paService.remove(id);
  }
}
