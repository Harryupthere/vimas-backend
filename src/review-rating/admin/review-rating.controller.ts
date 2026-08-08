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
import { ReviewRatingService } from '../review-rating.service';
import { SetVisibilityDto } from '../dto/set-visibility.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/review-rating')
export class ReviewRatingAdminController {
  constructor(private readonly reviewRatingService: ReviewRatingService) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.reviewRatingService.findAll(+page, +limit, search);
  }

  @Patch(':id/visibility')
  setVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetVisibilityDto,
  ) {
    return this.reviewRatingService.setVisibility(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewRatingService.adminRemove(id);
  }
}
