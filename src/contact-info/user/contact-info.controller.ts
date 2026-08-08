import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ContactInfoService } from '../contact-info.service';
import { CreateContactInfoDto } from '../dto/create-contact-info.dto';
import { UpdateContactInfoDto } from '../dto/update-contact-info.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('contact-info')
export class ContactInfoController {
  constructor(private readonly contactInfoService: ContactInfoService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateContactInfoDto) {
    return this.contactInfoService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('search') search?: string) {
    return this.contactInfoService.findAllMine(req.user.id, search);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.contactInfoService.findOneMine(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactInfoDto,
  ) {
    return this.contactInfoService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.contactInfoService.remove(req.user.id, id);
  }
}
