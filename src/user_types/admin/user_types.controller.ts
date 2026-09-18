import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { UserTypesService } from '../user_types.service';
import { CreateUserTypeDto } from '../dto/create-user-type.dto';
import { UpdateUserTypeDto } from '../dto/update-user-type.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin') // allows admin OR merchant
@Controller('admin/user-types')
export class UserTypesController {
  constructor(private readonly userTypesService: UserTypesService) {}

  @Post()
  @Permission('user-types.create')
  create(@Req() req, @Body() dto: CreateUserTypeDto) {
    return this.userTypesService.create(req.user.role, req.user.id, dto);
  }

  @Get()
  @Permission('user-types.view')
  findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('search') search: string,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.userTypesService.findAll(page, limit, search);
  }

  @Get(':id')
  @Permission('user-types.view')
  findOne(@Param('id') id: string) {
    return this.userTypesService.findOne(+id);
  }

  @Patch(':id')
  @Permission('user-types.update')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateUserTypeDto) {
    return this.userTypesService.update(req.user.role, req.user.id, +id, dto);
  }

  @Delete(':id')
  @Permission('user-types.delete')
  remove(@Req() req, @Param('id') id: string) {
    return this.userTypesService.remove(req.user.role, req.user.id, +id);
  }
}
