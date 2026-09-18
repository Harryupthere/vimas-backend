import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ChangePasswordAdminDto } from './changePassword.dto';
import { LoginAdminDto } from './login.dto';
import { RefreshTokenAdminDto } from './refresh-token.dto';
import { JwtAuthGuard } from '../shared/auth/strategies/auth.guard';
import { CreateAdminDto } from './create-admin.dto';
import { UpdateAdminDto } from './update-admin.dto';
import { PermissionGuard } from '../shared/auth/guards/permission.guard';
import { Permission } from '../shared/auth/decorators/permission.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() loginDto: LoginAdminDto) {
    // TODO: Later you can return JWT instead of raw admin
    return await this.adminService.validateLogin(loginDto);
  }

  @Post('refresh-token')
  async refreshToken(@Body() dto: RefreshTokenAdminDto) {
    return await this.adminService.refreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordAdminDto,
  ) {
    return this.adminService.changePassword(req.user.role, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permission('admins.create')
  @Post()
  createAdmin(@Req() req, @Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permission('admins.view')
  @Get()
  async findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('search') search: string,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.adminService.findAll(page, limit, search);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permission('admins.view')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permission('admins.update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(+id, dto);
  }
}
