import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards
} from '@nestjs/common';
import { UserTypesService } from '../user_types.service';
import { RolesGuard } from 'src/shared/auth/roles.guard';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('user/user-types')
export class UserTypesUserController {
  constructor(private readonly userTypesService: UserTypesService) {}

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
}
