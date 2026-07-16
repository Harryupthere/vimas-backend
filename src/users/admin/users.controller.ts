import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // allows admin OR merchant
@Controller('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users') // GET users
  findAll(
    @Query('page') pageStr: string = '1', // default page 1
    @Query('limit') limitStr: string = '10', // default 10 items per page
    @Query('search') search: string,
    @Query('user_type') userTypeStr: string, // <-- new query param
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    const userType = userTypeStr ? parseInt(userTypeStr) : undefined;
    return this.usersService.findAll(page, limit, search, userType);
  }

  @Get('user/:id') // GET user/:id
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Patch('user/:id') // PATCH user/:id
  update(@Param('id') id: string, @Body() userUpdate: UpdateUserDto) {
    return this.usersService.update(+id, userUpdate);
  }
}
