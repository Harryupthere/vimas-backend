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
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('admin/point-transaction')
export class PointTransactionAdminController {
  constructor(
    private readonly pointTransactionService: PointTransactionService,
  ) {}

  @Post()
  @Permission('point-transaction.create')
  create(@Body() dto: CreatePointTransactionDto) {
    return this.pointTransactionService.create(dto);
  }

  @Get()
  @Permission('point-transaction.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('walletType') walletType?: string,
    @Query('walletId') walletId?: string,
    @Query('search') search?: string,
  ) {
    return this.pointTransactionService.findAll(+page, +limit, {
      walletType,
      walletId: walletId ? +walletId : undefined,
      search,
    });
  }

  @Get(':id')
  @Permission('point-transaction.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pointTransactionService.findOne(id);
  }

  @Patch(':id')
  @Permission('point-transaction.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointTransactionDto,
  ) {
    return this.pointTransactionService.update(id, dto);
  }

  @Delete(':id')
  @Permission('point-transaction.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pointTransactionService.remove(id);
  }
}
