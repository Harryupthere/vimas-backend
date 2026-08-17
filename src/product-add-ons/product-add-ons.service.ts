import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductAddOn } from '../shared/entities/product-add-on.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductType } from '../shared/enums/product-type.enum';
import { CreateProductAddOnDto } from './dto/create-product-add-on.dto';
import { UpdateProductAddOnDto } from './dto/update-product-add-on.dto';

@Injectable()
export class ProductAddOnsService {
  constructor(
    @InjectRepository(ProductAddOn)
    private readonly addOnRepo: Repository<ProductAddOn>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductAddOnDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const { costPerUnit, ...rest } = dto;
    const addOn = this.addOnRepo.create({
      ...rest,
      ...(costPerUnit !== undefined && { costPerUnit: costPerUnit ? 1 : 0 }),
    });
    await this.addOnRepo.save(addOn);
    return { data: addOn, message: 'Product add-on created successfully' };
  }

  async findAll(
    productId?: number,
    productType?: ProductType,
    isActive?: number,
    search?: string,
  ) {
    const query = this.addOnRepo
      .createQueryBuilder('addOn')
      .leftJoinAndSelect('addOn.product', 'product')
      .orderBy('addOn.id', 'DESC');

    if (productId) {
      query.andWhere('addOn.product_id = :productId', { productId });
    }
    if (productType) {
      query.andWhere('addOn.product_type = :productType', { productType });
    }
    if (isActive !== undefined) {
      query.andWhere('addOn.is_active = :isActive', { isActive });
    }
    if (search) {
      query.andWhere('(addOn.name LIKE :search OR product.name LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const data = await query.getMany();
    return { data, message: 'Product add-ons fetched successfully' };
  }

  async findOne(id: number) {
    const addOn = await this.addOnRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!addOn) throw new NotFoundException('Product add-on not found');
    return { data: addOn, message: 'Product add-on' };
  }

  async update(id: number, dto: UpdateProductAddOnDto) {
    const addOn = await this.addOnRepo.findOne({ where: { id } });
    if (!addOn) throw new NotFoundException('Product add-on not found');

    const { costPerUnit, ...rest } = dto;
    Object.assign(addOn, {
      ...rest,
      ...(costPerUnit !== undefined && { costPerUnit: costPerUnit ? 1 : 0 }),
    });
    await this.addOnRepo.save(addOn);
    return { data: addOn, message: 'Product add-on updated successfully' };
  }

  async remove(id: number) {
    const addOn = await this.addOnRepo.findOne({ where: { id } });
    if (!addOn) throw new NotFoundException('Product add-on not found');

    await this.addOnRepo.remove(addOn);
    return { message: 'Product add-on removed successfully' };
  }

  // Buyer preview — active add-ons for a product+type, shown at checkout so
  // the buyer can opt into any of them (see CheckoutPricingService's
  // addOnIds option for how a selected add-on is actually priced).
  async findAvailableForProduct(productId: number, productType: ProductType) {
    const data = await this.addOnRepo.find({
      where: { productId, productType, isActive: 1 },
      order: { id: 'DESC' },
    });
    return { data, message: 'Product add-ons fetched successfully' };
  }

  // Used by CheckoutPricingService to validate/find requested add-on ids.
  async findByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.addOnRepo
      .createQueryBuilder('addOn')
      .where('addOn.id IN (:...ids)', { ids })
      .getMany();
  }
}
