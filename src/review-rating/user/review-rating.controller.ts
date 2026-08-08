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
import { ReviewRatingService } from '../review-rating.service';
import { CreateReviewRatingDto } from '../dto/create-review-rating.dto';
import { UpdateReviewRatingDto } from '../dto/update-review-rating.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('review-rating')
export class ReviewRatingController {
  constructor(private readonly reviewRatingService: ReviewRatingService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateReviewRatingDto) {
    return this.reviewRatingService.create(req.user.id, dto);
  }

  @Get('product/:productId')
  findForProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.reviewRatingService.findForProduct(
      productId,
      +page,
      +limit,
      search,
    );
  }

  @Get('my')
  findMine(@Req() req: any, @Query('search') search?: string) {
    return this.reviewRatingService.findMine(req.user.id, search);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewRatingDto,
  ) {
    return this.reviewRatingService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.reviewRatingService.remove(req.user.id, id);
  }
}
