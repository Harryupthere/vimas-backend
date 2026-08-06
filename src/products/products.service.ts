import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Product } from '../shared/entities/products.entity';
import {
  PointDistribution,
  PointDistributionStatus,
  PointEventType,
} from '../shared/entities/point-distribution.entity';
import {
  ProductFeedback,
  ProductFeedbackStatus,
} from '../shared/entities/product-feedback.entity';
import { ProductFeedbackLike } from '../shared/entities/product-feedback-like.entity';
import { calculateSharedPoints } from '../shared/utils/point-sharing.util';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductHistoryService } from '../product-history/product-history.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(PointDistribution)
    private readonly pointDistributionRepo: Repository<PointDistribution>,

    @InjectRepository(ProductFeedback)
    private readonly productFeedbackRepo: Repository<ProductFeedback>,

    @InjectRepository(ProductFeedbackLike)
    private readonly productFeedbackLikeRepo: Repository<ProductFeedbackLike>,

    private readonly productHistoryService: ProductHistoryService,
  ) {}

  private buildProductEntity(dto: CreateProductDto) {
    return this.productRepo.create({
      ...dto,
      discountAvailable: dto.discountAvailable ? 1 : 0,
      stockShow: dto.stockShow ? 1 : 0,
      labelShow: dto.labelShow ? 1 : 0,
      showTotalPoints: dto.showTotalPoints ? 1 : 0,
      showPointsSharing: dto.showPointsSharing ? 1 : 0,
      bulkAvailable: dto.bulkAvailable ? 1 : 0,
      isOutOfStock: 0,
      status: 0,
    });
  }

  // Batch-loads top-level, active feedback (with its likes) for a set of
  // products in 2 queries total, keyed by productId — used by both the
  // list and single-product responses so a product listing never triggers
  // N+1 feedback queries.
  private async loadFeedbackByProduct(
    productIds: number[],
  ): Promise<Map<number, any[]>> {
    const feedbackByProduct = new Map<number, any[]>();
    if (!productIds.length) return feedbackByProduct;

    const feedbackRows = await this.productFeedbackRepo.find({
      where: {
        productId: In(productIds),
        parentFeedbackId: IsNull(),
        status: ProductFeedbackStatus.ACTIVE,
      },
      relations: ['user'],
      order: { id: 'DESC' },
    });

    const feedbackIds = feedbackRows.map((f) => f.id);
    const likeRows = feedbackIds.length
      ? await this.productFeedbackLikeRepo.find({
          where: { feedbackId: In(feedbackIds) },
          relations: ['user'],
        })
      : [];

    const likesByFeedback = new Map<number, ProductFeedbackLike[]>();
    for (const like of likeRows) {
      const list = likesByFeedback.get(like.feedbackId) ?? [];
      list.push(like);
      likesByFeedback.set(like.feedbackId, list);
    }

    for (const feedback of feedbackRows) {
      const enriched = {
        ...feedback,
        likes: likesByFeedback.get(feedback.id) ?? [],
      };
      const list = feedbackByProduct.get(feedback.productId) ?? [];
      list.push(enriched);
      feedbackByProduct.set(feedback.productId, list);
    }

    return feedbackByProduct;
  }

  // Admin adding a product directly — admin is the sole product creator now
  // (no merchant-type users, no merchant_id column). Still starts
  // unpublished (status 0); admin flips it live via update().
  async createByAdmin(dto: CreateProductDto) {
    const product = this.buildProductEntity(dto);

    await this.productRepo.save(product);
    return { data: product, message: 'Product created successfully' };
  }

  async findAll(page: number, limit: number) {
    const products = await this.productRepo.find({
      relations: [
        'category',
        'brand',
        'productMedia',
        'paymentOptions',
        'paymentOptions.paymentOption',
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.productRepo.count();

    const feedbackByProduct = await this.loadFeedbackByProduct(
      products.map((p) => p.id),
    );
    const productsWithFeedback = products.map((p) => ({
      ...p,
      feedback: feedbackByProduct.get(p.id) ?? [],
    }));

    return {
      data: { products: productsWithFeedback, page, limit, total },
      message: 'Products retrieved successfully',
    };
  }

  async findAllProductsUsers(page: number, limit: number, type?: string) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.productMedia', 'media')
      .leftJoinAndSelect('product.paymentOptions', 'paymentOptions')
      .where('product.status = :status', { status: 1 })
      .skip((page - 1) * limit)
      .take(limit);

    // reseller listing — only bulk-purchasable products
    if (type === 'reseller') {
      query.andWhere('product.bulk_available = :bulkAvailable', {
        bulkAvailable: 1,
      });
    }

    const [products, total] = await query.getManyAndCount();

    const feedbackByProduct = await this.loadFeedbackByProduct(
      products.map((p) => p.id),
    );

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
        ...(p.stockShow ? { stock: p.stock } : {}),
        ...(p.labelShow
          ? { labelText: p.labelText, labelColor: p.labelColor }
          : {}),
        sellingPrice: p.sellingPrice,
        viewCount: p.viewCount,
        likeCount: p.likeCount,
        bulkAvailable: p.bulkAvailable,
        feedback: feedbackByProduct.get(p.id) ?? [],
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
        'productMedia',
        'paymentOptions.paymentOption',
      ],
    });

    if (!product) {
      return { data: product, message: 'Product retrieved successfully' };
    }

    const feedbackByProduct = await this.loadFeedbackByProduct([product.id]);
    const result = {
      ...product,
      feedback: feedbackByProduct.get(product.id) ?? [],
    };

    return { data: result, message: 'Product retrieved successfully' };
  }

  async findOneProductUsers(id: number, type?: string) {
    const product = await this.productRepo.findOne({
      where: {
        id,
        status: 1, // only active products
        // reseller access — only bulk-purchasable products
        ...(type === 'reseller' ? { bulkAvailable: 1 } : {}),
      },
      relations: [
        'category',
        'brand',
        'productMedia',
        'paymentOptions.paymentOption',
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
      viewCount: product.viewCount + 1,
      likeCount: product.likeCount,
      bulkAvailable: product.bulkAvailable,
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

    // Conditionally include the total points this product carries
    if (product.showTotalPoints === 1) {
      result.totalPoints = Number(product.totalPoints);
    }

    // Conditionally include the per-receiver breakdown of how those points
    // get shared out (buyer/upline/pool) — same percentages the purchase
    // queue actually credits with, via calculateSharedPoints.
    if (product.showPointsSharing === 1) {
      const activeRules = await this.pointDistributionRepo.find({
        where: {
          eventType: PointEventType.BUY_PRODUCT,
          status: PointDistributionStatus.ACTIVE,
        },
        order: { priority: 'ASC' },
      });

      const totalPointsPerUnit = Number(product.totalPoints);
      result.pointsSharing = activeRules.map((rule) => ({
        receiverType: rule.receiverType,
        pointsPercentage: Number(rule.pointsPercentage),
        points: calculateSharedPoints(
          totalPointsPerUnit,
          Number(rule.pointsPercentage),
        ),
      }));
    }

    const feedbackByProduct = await this.loadFeedbackByProduct([product.id]);
    result.feedback = feedbackByProduct.get(product.id) ?? [];

    return { data: result, message: 'Product retrieved successfully' };
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.productRepo.findOneBy({ id });

    const mappedDto: any = {
      ...dto,
      ...(dto.discountAvailable !== undefined && {
        discountAvailable: dto.discountAvailable ? 1 : 0,
      }),
      ...(dto.stockShow !== undefined && { stockShow: dto.stockShow ? 1 : 0 }),
      ...(dto.labelShow !== undefined && { labelShow: dto.labelShow ? 1 : 0 }),
      ...(dto.showTotalPoints !== undefined && {
        showTotalPoints: dto.showTotalPoints ? 1 : 0,
      }),
      ...(dto.showPointsSharing !== undefined && {
        showPointsSharing: dto.showPointsSharing ? 1 : 0,
      }),
      ...(dto.bulkAvailable !== undefined && {
        bulkAvailable: dto.bulkAvailable ? 1 : 0,
      }),
    };

    await this.productRepo.update(id, mappedDto);

    if (existing) {
      await this.productHistoryService.record(
        id,
        'products',
        existing,
        mappedDto,
      );
    }

    return { message: 'Product updated successfully' };
  }

  async remove(id: number) {
    await this.productRepo.delete(id);
    return { message: 'Product removed successfully' };
  }
}
