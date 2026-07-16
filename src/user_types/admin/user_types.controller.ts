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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // allows admin OR merchant
@Controller('admin/user-types')
export class UserTypesController {
  constructor(private readonly userTypesService: UserTypesService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateUserTypeDto) {
    return this.userTypesService.create(req.user.role, req.user.id, dto);
  }

  @Get()
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
  findOne(@Param('id') id: string) {
    return this.userTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateUserTypeDto) {
    return this.userTypesService.update(req.user.role, req.user.id, +id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.userTypesService.remove(req.user.role, req.user.id, +id);
  }
}
