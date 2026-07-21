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
import { PointTransactionService } from '../point-transaction.service';
import { CreatePointTransactionDto } from '../dto/create-point-transaction.dto';
import { UpdatePointTransactionDto } from '../dto/update-point-transaction.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RolesGuard } from '../../shared/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/point-transaction')
export class PointTransactionAdminController {
  constructor(
    private readonly pointTransactionService: PointTransactionService,
  ) {}

  @Post()
  create(@Body() dto: CreatePointTransactionDto) {
    return this.pointTransactionService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('walletType') walletType?: string,
    @Query('walletId') walletId?: string,
  ) {
    return this.pointTransactionService.findAll(+page, +limit, {
      walletType,
      walletId: walletId ? +walletId : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointTransactionService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointTransactionDto,
  ) {
    return this.pointTransactionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointTransactionService.remove(id);
  }
}
