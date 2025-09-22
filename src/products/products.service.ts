import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../shared/entities/products.entity';
import { User } from '../shared/entities/user.entity';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(id: number, dto: CreateProductDto) {
    if (!id) {
      return { message: 'User not found' };
    }

    const user = await this.userRepo.findOne({ where: { id: id } });

    if (!user) {
      return { message: 'User not found' };
    }
    // if(user.userType!==2){
    //   return { message: 'Only merchants can create products' };
    // }

    const product = this.productRepo.create({
      ...dto,
      discountAvailable: dto.discountAvailable ? 1 : 0,
      stockShow: dto.stockShow ? 1 : 0,
      labelShow: dto.labelShow ? 1 : 0,
      merchantId: user.id,
    });

    await this.productRepo.save(product);
    return { data: product, message: 'Product created successfully' };
  }

  async findAll(page: number, limit: number) {
    const products = await this.productRepo.find({
      relations: [
        'category',
        'brand',
        'merchant',
        'productMedia',
        'paymentOptions',
        'paymentOptions.paymentOption',
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.productRepo.count();

    return {
      data: { products, page, limit, total },
      message: 'Products retrieved successfully',
    };
  }
  async findAllProducts(id: number, page: number, limit: number) {
    const products = await this.productRepo.find({
      where: { merchantId: id },
      relations: [
        'category',
        'brand',
        'productMedia',
        'paymentOptions',
        'paymentOptions.paymentOption',
        'cartItems', // ✅ include relation
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.productRepo.count({ where: { merchantId: id } });

    // Add cartCount field
    const productsWithCartCount = products.map((product) => ({
      ...product,
      cartCount: product.cartItems ? product.cartItems.length : 0,
    }));

    return {
      data: { products: productsWithCartCount, page, limit, total },
      message: 'Products retrieved successfully',
    };
  }

  async findAllProductsUsers(page: number, limit: number) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.productMedia', 'media')
      .leftJoinAndSelect('product.paymentOptions', 'paymentOptions')
      .leftJoin('users', 'merchant', 'merchant.id = product.merchantId') // manual join with users table
      .addSelect(['merchant.first_name']) // only fetch merchant name
      .where('product.status = :status', { status: 1 })
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await query.getManyAndCount();

    // Transform output
    const transformed = products.map((p) => {
      return {
        id: p.id,
        name: p.name,
        subTitle: p.subTitle,
        description: p.description,
        notes: p.notes,
        information: p.information,
        keyPoints: p.keyPoints,
        details: p.details,
        searchKeywords: p.searchKeywords,
        discountAvailable: p.discountAvailable,
        discountAmount: p.discountAmount,
        discountPercentage: p.discountPercentage,

        category: p.category?.name,
        brand: p.brand?.name,
        media: p.productMedia,
        by: (p as any).merchant?.first_name || 'Unknown', // since we joined users manually
        ...(p.stockShow ? { stock: p.stock } : {}),
        ...(p.labelShow
          ? { labelText: p.labelText, labelColor: p.labelColor }
          : {}),
        sellingPrice: p.sellingPrice,
        viewCount: p.viewCount,
        likeCount: p.likeCount,
      };
    });

    return {
      data: { products: transformed, page, limit, total },
      message: 'Products retrieved successfully',
    };
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: [
        'category',
        'brand',
        'merchant',
        'productMedia',
        'paymentOptions.paymentOption',
      ],
    });
    return { data: product, message: 'Product retrieved successfully' };
  }

  async findOneProduct(userId: number, id: number) {
    const product = await this.productRepo.findOne({
      where: { id, merchantId: userId },
      relations: [
        'category',
        'brand',
        'productMedia',
        'paymentOptions',
        'paymentOptions.paymentOption',
        'cartItems', // ✅ include relation
      ],
    });

    if (!product) {
      return { message: 'Product not found' };
    }

    return {
      data: {
        ...product,
        cartCount: product.cartItems ? product.cartItems.length : 0,
      },
      message: 'Product retrieved successfully',
    };
  }

  async findOneProductUsers(id: number) {
    const product = await this.productRepo.findOne({
      where: { id, status: 1 }, // only active products
      relations: [
        'category',
        'brand',
        'productMedia',
        'paymentOptions.paymentOption',
        'merchant',
      ],
    });

    if (!product) {
      return { message: 'Product not found' };
    }

    // Update view count
    await this.productRepo.update(id, {
      viewCount: (product.viewCount || 0) + 1,
    });

    // Format response for buyers
    const result: any = {
      id: product.id,
      name: product.name,
      subTitle: product.subTitle,
      description: product.description,
      notes: product.notes,
      information: product.information,
      keyPoints: product.keyPoints,
      details: product.details,
      searchKeywords: product.searchKeywords,
      discountAvailable: product.discountAvailable,
      discountAmount: product.discountAmount,
      discountPercentage: product.discountPercentage,
      sellingPrice: product.sellingPrice,
      category: product.category?.name,
      brand: product.brand?.name,
      media: product.productMedia || [],
      paymentOptions: product.paymentOptions || [],
      by: (product as any).merchant?.first_name || 'Unknown', // fetch only merchant name
      viewCount: product.viewCount + 1,
      likeCount: product.likeCount,
    };

    // Conditionally include stock
    if (product.stockShow === 1) {
      result.stock = product.stock;
    }

    // Conditionally include label
    if (product.labelShow === 1) {
      result.labelText = product.labelText;
      result.labelColor = product.labelColor;
    }

    return { data: result, message: 'Product retrieved successfully' };
  }

  async update(id: number, dto: UpdateProductDto) {
    const mappedDto: any = {
      ...dto,
      ...(dto.discountAvailable !== undefined && {
        discountAvailable: dto.discountAvailable ? 1 : 0,
      }),
      ...(dto.stockShow !== undefined && { stockShow: dto.stockShow ? 1 : 0 }),
      ...(dto.labelShow !== undefined && { labelShow: dto.labelShow ? 1 : 0 }),
    };

    await this.productRepo.update(id, mappedDto);
    return { message: 'Product updated successfully' };
  }

  async remove(id: number) {
    await this.productRepo.delete(id);
    return { message: 'Product removed successfully' };
  }
}
