import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query
} from '@nestjs/common';
import { RegistrationTypesService } from '../registration_types.service';

@Controller('user/registration-types')
export class RegistrationTypesUserController {
  constructor(
    private readonly registrationTypesService: RegistrationTypesService,
  ) {}

  @Get()
  findAll(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '10',
    @Query('search') search: string,
  ) {
    const page = parseInt(pageStr);
    const limit = parseInt(limitStr);
    return this.registrationTypesService.findAll(page, limit, search);
  }
}
