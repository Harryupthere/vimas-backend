import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductFeedbackService } from '../product-feedback.service';
import { SetFeedbackStatusDto } from '../dto/set-feedback-status.dto';
import { ProductFeedbackStatus } from '../../shared/entities/product-feedback.entity';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/product-feedback')
export class ProductFeedbackAdminController {
  constructor(
    private readonly productFeedbackService: ProductFeedbackService,
  ) {}

  @Get()
  @Permission('product-feedback.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
    @Query('status') status?: ProductFeedbackStatus,
    @Query('search') search?: string,
  ) {
    return this.productFeedbackService.findAll(+page, +limit, {
      productId: productId ? +productId : undefined,
      status,
      search,
    });
  }

  @Get(':id')
  @Permission('product-feedback.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.findOne(id);
  }

  @Patch(':id/status')
  @Permission('product-feedback.update')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetFeedbackStatusDto,
  ) {
    return this.productFeedbackService.setStatus(id, dto);
  }

  @Delete(':id')
  @Permission('product-feedback.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.adminRemove(id);
  }
}
