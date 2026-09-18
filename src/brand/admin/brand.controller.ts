import { Controller, UseGuards } from '@nestjs/common';
import { Get, Post, Body, Patch, Param, Query, Delete } from '@nestjs/common';
import { BrandService } from '../brand.service';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/updte-brand.dto';
import { CreateCategoryBrandDto } from '../dto/category-brand.dto';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { PermissionGuard } from 'src/shared/auth/guards/permission.guard';
import { Permission } from 'src/shared/auth/decorators/permission.decorator';
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  // GET brands (with pagination)
  @Get('brands')
  @Permission('brands.view')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.brandService.findAll(+page, +limit, search);
  }

  // GET single brand by id
  @Get('brand/:id')
  @Permission('brands.view')
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(+id);
  }

  // CREATE new brand
  @Post('brand')
  @Permission('brands.create')
  create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  // UPDATE brand
  @Patch('brand/:id')
  @Permission('brands.update')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(+id, dto);
  }

  // GET brands by category
  @Get('category-brands/:id')
  @Permission('brands.view')
  getBrandsByCategory(@Param('id') id: number) {
    return this.brandService.getBrandsByCategory(id);
  }

  // GET categories by brand
  @Get('brand-category/:id')
  @Permission('brands.view')
  getCategoriesByBrand(@Param('id') id: number) {
    return this.brandService.getCategoriesByBrand(id);
  }

  // ADD mapping (category ↔ brand)
  @Post('brand-category/map')
  @Permission('brands.update')
  async addMapping(@Body() body: { categoryId: number; brandId: number }) {
    return this.brandService.addMapping(new CreateCategoryBrandDto());
  }

  // REMOVE mapping (category ↔ brand)
  @Delete('brand-category/map')
  @Permission('brands.update')
  async removeMapping(@Body() body: { categoryId: number; brandId: number }) {
    return this.brandService.removeMapping(body.categoryId, body.brandId);
  }
}
