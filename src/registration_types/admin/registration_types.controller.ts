import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { RegistrationTypesService } from '../registration_types.service';
import { CreateRegistrationTypeDto } from '../dto/create-registration-type.dto';
import { UpdateRegistrationTypeDto } from '../dto/update-registration-type.dto';

@Controller('admin/registration-types')
export class RegistrationTypesController {
  constructor(private readonly registrationTypesService: RegistrationTypesService) {}

  @Post()
  create(@Body() dto: CreateRegistrationTypeDto) {
    return this.registrationTypesService.create(dto);
  }

  @Get()
  findAll() {
    return this.registrationTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registrationTypesService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRegistrationTypeDto) {
    return this.registrationTypesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registrationTypesService.remove(+id);
  }
}
