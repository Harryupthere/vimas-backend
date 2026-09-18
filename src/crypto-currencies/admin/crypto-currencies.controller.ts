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

// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/crypto-currencies')
export class CryptoCurrenciesAdminController {
  constructor(
    private readonly cryptoCurrenciesService: CryptoCurrenciesService,
  ) {}

  @Post()
  @Permission('crypto-currencies.create')
  create(@Body() dto: CreateCryptoCurrencyDto) {
    return this.cryptoCurrenciesService.create(dto);
  }

  @Get()
  @Permission('crypto-currencies.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.cryptoCurrenciesService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Permission('crypto-currencies.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cryptoCurrenciesService.findOne(id);
  }

  @Patch(':id')
  @Permission('crypto-currencies.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCryptoCurrencyDto,
  ) {
    return this.cryptoCurrenciesService.update(id, dto);
  }

  @Delete(':id')
  @Permission('crypto-currencies.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cryptoCurrenciesService.remove(id);
  }
}
