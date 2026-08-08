import {
  Body,
  Controller,
  Post,
  Patch,
  Param,
  UseGuards,
  Req,
  Get,
  Query,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UpdateUserDto } from '../dto/update-user.dto';

import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { RolesGuard } from 'src/shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    // req.user is populated by JwtStrategy.validate
    return this.usersService.getProfile(req.user.role, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.role, req.user.id, dto);
  }

  @Patch('password')
  async updatePassword(@Req() req, @Body() body: any) {
    return this.usersService.updatePassword(req.user.id, body);
  }

  // "my team" — teammates for the requested referral level (1 = direct
  // referrals, 2 = their referrals), with per-teammate purchase/earnings
  // stats. One endpoint managed by `level` so the frontend can drive its
  // two separate level-1/level-2 tables off the same call.
  @UseGuards(JwtAuthGuard)
  @Get('my-team')
  async getMyTeam(
    @Req() req,
    @Query('level') level: string = '1',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.usersService.getMyTeam(
      req.user.id,
      +level,
      +page,
      +limit,
      search,
    );
  }
}
