import { Controller } from '@nestjs/common';
import { Get, Query } from '@nestjs/common';
import { CategoryService } from '../category.service';
@Controller('category')
export class CategoryUserController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAllNoPagination();
  }

  
}
