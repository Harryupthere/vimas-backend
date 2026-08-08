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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductFeedbackService } from '../product-feedback.service';
import { CreateProductFeedbackDto } from '../dto/create-product-feedback.dto';
import { UpdateProductFeedbackDto } from '../dto/update-product-feedback.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('product-feedback')
export class ProductFeedbackController {
  constructor(
    private readonly productFeedbackService: ProductFeedbackService,
  ) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateProductFeedbackDto) {
    return this.productFeedbackService.create(req.user.id, dto);
  }

  @Get('product/:productId')
  findForProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.productFeedbackService.findForProduct(
      productId,
      +page,
      +limit,
      search,
    );
  }

  @Get('my')
  findMine(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.productFeedbackService.findMine(
      req.user.id,
      +page,
      +limit,
      search,
    );
  }

  @Get(':id/replies')
  findReplies(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.productFeedbackService.findReplies(id, +page, +limit, search);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductFeedbackDto,
  ) {
    return this.productFeedbackService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.remove(req.user.id, id);
  }

  @Post(':id/like')
  like(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.like(req.user.id, id);
  }

  @Delete(':id/like')
  unlike(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.productFeedbackService.unlike(req.user.id, id);
  }
}
