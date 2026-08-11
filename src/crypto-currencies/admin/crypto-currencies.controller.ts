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
  UseGuards,
} from '@nestjs/common';
import { CryptoCurrenciesService } from '../crypto-currencies.service';
import { CreateCryptoCurrencyDto } from '../dto/create-crypto-currency.dto';
import { UpdateCryptoCurrencyDto } from '../dto/update-crypto-currency.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/crypto-currencies')
export class CryptoCurrenciesAdminController {
  constructor(
    private readonly cryptoCurrenciesService: CryptoCurrenciesService,
  ) {}

  @Post()
  create(@Body() dto: CreateCryptoCurrencyDto) {
    return this.cryptoCurrenciesService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.cryptoCurrenciesService.findAll(+page, +limit, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cryptoCurrenciesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCryptoCurrencyDto,
  ) {
    return this.cryptoCurrenciesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cryptoCurrenciesService.remove(id);
  }
}
