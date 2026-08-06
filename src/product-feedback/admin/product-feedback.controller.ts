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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/product-feedback')
export class ProductFeedbackAdminController {
  constructor(
    private readonly productFeedbackService: ProductFeedbackService,
  ) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
    @Query('status') status?: ProductFeedbackStatus,
  ) {
    return this.productFeedbackService.findAll(+page, +limit, {
      productId: productId ? +productId : undefined,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.findOne(id);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetFeedbackStatusDto,
  ) {
    return this.productFeedbackService.setStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.adminRemove(id);
  }
}
