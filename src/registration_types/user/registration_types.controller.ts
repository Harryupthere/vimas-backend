import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { RegistrationTypesService } from '../registration_types.service';


@Controller('user/registration-types')
export class RegistrationTypesUserController {
  constructor(private readonly registrationTypesService: RegistrationTypesService) {}

  @Get()
  findAll() {
    return this.registrationTypesService.findAll();
  }

}
