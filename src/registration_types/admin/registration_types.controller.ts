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
  Query
} from '@nestjs/common';
import { RegistrationTypesService } from '../registration_types.service';
import { CreateRegistrationTypeDto } from '../dto/create-registration-type.dto';
import { UpdateRegistrationTypeDto } from '../dto/update-registration-type.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // allows admin OR merchant
@Controller('admin/registration-types')
export class RegistrationTypesController {
  constructor(
    private readonly registrationTypesService: RegistrationTypesService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateRegistrationTypeDto) {
    return this.registrationTypesService.create(
      dto,
    );
  }

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registrationTypesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationTypeDto,
  ) {
    return this.registrationTypesService.update(

      +id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.registrationTypesService.remove(

      +id,
    );
  }
}
