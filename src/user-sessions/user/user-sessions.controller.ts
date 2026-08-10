import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserSessionsService } from '../user-sessions.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user-sessions')
export class UserSessionsUserController {
  constructor(private readonly userSessionsService: UserSessionsService) {}

  // "my sessions" — scoped to the logged-in user's own sessions only,
  // never a generic list (other users' session/device data is private)
  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.userSessionsService.findMine(
      req.user.id,
      +page,
      +limit,
      search,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.userSessionsService.findMineOne(req.user.id, id);
  }
}
