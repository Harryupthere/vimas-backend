import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { SearchService } from '../search.service';
import type { SearchType } from '../search.service';

// Overall search bar — one endpoint backing every dropdown category
// (reseller/consumer/partner products, reward mall products, and the
// caller's own referral downline). See SearchService for per-category
// filtering/field rules.
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Req() req: any,
    @Query('type') type: SearchType = 'all',
    @Query('q') q?: string,
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
  ) {
    return this.searchService.search(
      req.user.id,
      type,
      q,
      parseInt(pageStr, 10) || 1,
      parseInt(limitStr, 10) || 10,
    );
  }
}
