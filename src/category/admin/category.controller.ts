import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';

// import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)

@Controller('admin')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // GET categories (with pagination)
  @Get('categories')
  @Permission('categories.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.categoryService.findAll(+page, +limit, search);
  }

  // GET single category by id
  @Get('category/:id')
  @Permission('categories.view')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  // CREATE new category
  @Post('category')
  @Permission('categories.create')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // UPDATE category
  @Patch('category/:id')
  @Permission('categories.update')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(+id, dto);
  }
}
