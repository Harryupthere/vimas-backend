import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserTypesService } from '../user_types.service';
import { CreateUserTypeDto } from '../dto/create-user-type.dto';
import { UpdateUserTypeDto } from '../dto/update-user-type.dto';

@Controller('user/user-types')
export class UserTypesUserController {
  constructor(private readonly userTypesService: UserTypesService) {}

  @Post()
  create(@Body() dto: CreateUserTypeDto) {
    return this.userTypesService.create(dto);
  }

  @Get()
  findAll() {
    return this.userTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userTypesService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserTypeDto) {
    return this.userTypesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userTypesService.remove(+id);
  }
}
