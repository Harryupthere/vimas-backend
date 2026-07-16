import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ChangePasswordAdminDto } from './changePassword.dto';
import { LoginAdminDto } from './login.dto';
import { JwtAuthGuard } from '../shared/auth/strategies/auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() loginDto: LoginAdminDto) {
    // TODO: Later you can return JWT instead of raw admin
    return await this.adminService.validateLogin(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordAdminDto,
  ) {
    return this.adminService.changePassword(req.user.role, changePasswordDto);
  }
}
