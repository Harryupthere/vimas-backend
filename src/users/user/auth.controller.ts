import { Body, Controller, Post, Query, Get, Req } from '@nestjs/common';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { ForgotPasswordDto } from 'src/users/dto/forgot-password.dto';
import { ResetPasswordDto } from 'src/users/dto/reset-password.dto';
import { RefreshTokenDto } from 'src/users/dto/refresh-token.dto';
import type { Request } from 'express';
@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const ip =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.socket?.remoteAddress ||
      'unknown';

    const user_agent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'] || 'unknown';

    const device_id = Array.isArray(req.headers['x-device-id'])
      ? req.headers['x-device-id'][0]
      : req.headers['x-device-id'] || 'unknown';

    createUserDto.ip = ip;
    createUserDto.user_agent = user_agent;
    createUserDto.device_id = device_id;
    return this.usersService.create(createUserDto);
  }

  @Post('refresh-token')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.usersService.refreshToken(dto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto, @Req() req: Request) {
    const ip =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.socket?.remoteAddress ||
      'unknown';

    const user_agent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'] || 'unknown';

    const device_id = Array.isArray(req.headers['x-device-id'])
      ? req.headers['x-device-id'][0]
      : req.headers['x-device-id'] || 'unknown';

    loginUserDto.ip = ip;
    loginUserDto.user_agent = user_agent;
    loginUserDto.device_id = device_id;
    return this.usersService.login(loginUserDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  // Request forgot password (console-only email)
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.usersService.requestPasswordReset(body);
  }

  // Reset password using token
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body);
  }
}
