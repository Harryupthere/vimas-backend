import { Controller, Get, Param } from '@nestjs/common';
import { BrandService } from '../brand.service';

@Controller('brands')
export class BrandUserController {
  constructor(private readonly brandService: BrandService) {}

  // ✅ Get all brands (no pagination)
  @Get()
  findAll() {
    return this.brandService.findAllNoPagination();
  }

  // ✅ Get brands for a given category
  @Get('category/:id')
  getBrandsByCategory(@Param('id') id: number) {
    return this.brandService.getBrandsByCategory(id);
  }

  // ✅ Get categories for a given brand
  @Get(':id/categories')
  getCategoriesByBrand(@Param('id') id: number) {
    return this.brandService.getCategoriesByBrand(id);
  }
}
