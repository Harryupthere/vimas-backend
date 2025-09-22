import {
  Body,
  Controller,
  Post,
  Patch,
  Param,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UpdateUserDto } from '../dto/update-user.dto';

import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Controller('users')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    // req.user is populated by JwtStrategy.validate
    return this.usersService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}
