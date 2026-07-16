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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // allows admin OR merchant
@Controller('admin')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // GET categories (with pagination)
  @Get('categories')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.categoryService.findAll(+page, +limit, search);
  }

  // GET single category by id
  @Get('category/:id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  // CREATE new category
  @Post('category')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // UPDATE category
  @Patch('category/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(+id, dto);
  }
}
