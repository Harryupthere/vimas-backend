import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { MembershipTypesService } from '../membership-types.service';
import { CreateMembershipTypeDto } from '../dto/create-membership-type.dto';
import { UpdateMembershipTypeDto } from '../dto/update-membership-type.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/membership-types')
export class MembershipTypesController {
  constructor(
    private readonly membershipTypesService: MembershipTypesService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateMembershipTypeDto) {
    return this.membershipTypesService.create(
      req.user.role,
      req.user.id,
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
    return this.membershipTypesService.findAll(page, limit, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membershipTypesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipTypeDto,
  ) {
    return this.membershipTypesService.update(
      req.user.role,
      req.user.id,
      +id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.membershipTypesService.remove(req.user.role, req.user.id, +id);
  }
}
