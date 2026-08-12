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
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { calculateSharedPoints } from '../shared/utils/point-sharing.util';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductHistoryService } from '../product-history/product-history.service';
import { ProductViewsService } from '../product-views/product-views.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationCategoryName,
  NotificationTypeName,
} from '../notifications/notification-names';

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

    @InjectRepository(ProductBulkDetail)
    private readonly bulkDetailRepo: Repository<ProductBulkDetail>,

    private readonly productHistoryService: ProductHistoryService,
    private readonly productViewsService: ProductViewsService,
    private readonly notificationsService: NotificationsService,
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
      // consumer/partner default to available (matches the columns' DB
      // default of 1) unless the admin explicitly opts a product out.
      consumerAvailable: dto.consumerAvailable === false ? 0 : 1,
      partnerAvailable: dto.partnerAvailable === false ? 0 : 1,
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

  private async getActivePointDistributionRules() {
    return this.pointDistributionRepo.find({
      where: {
        eventType: PointEventType.BUY_PRODUCT,
        status: PointDistributionStatus.ACTIVE,
      },
      order: { priority: 'ASC' },
    });
  }

  // Shared by both the product-level (consumer) and bulk-detail-level
  // (reseller) points display — same "show flag gates the field" rule,
  // just fed a different totalPoints/show* source depending on caller.
  private buildPointsInfo(
    showTotalPoints: number,
    showPointsSharing: number,
    totalPoints: number,
    activeRules: PointDistribution[],
  ): { totalPoints?: number; pointsSharing?: any[] } {
    const info: { totalPoints?: number; pointsSharing?: any[] } = {};

    if (showTotalPoints === 1) {
      info.totalPoints = Number(totalPoints);
    }

    if (showPointsSharing === 1) {
      const totalPointsPerUnit = Number(totalPoints);
      info.pointsSharing = activeRules.map((rule) => ({
        receiverType: rule.receiverType,
        pointsPercentage: Number(rule.pointsPercentage),
        points: calculateSharedPoints(
          totalPointsPerUnit,
          Number(rule.pointsPercentage),
        ),
      }));
    }

    return info;
  }

  // Reseller variant of buildPointsInfo — same show-flag logic, but sourced
  // per bulk package (product_bulk_details.show_total_points/
  // show_points_sharing/total_points) instead of the parent product's
  // columns, since a reseller buys via a specific package. Batches every
  // active package for the given products in one query, keyed by productId.
  private async loadBulkPointsSharingByProduct(
    productIds: number[],
    activeRules: PointDistribution[],
  ): Promise<Map<number, any[]>> {
    const byProduct = new Map<number, any[]>();
    if (!productIds.length) return byProduct;

    const bulkDetails = await this.bulkDetailRepo.find({
      where: { productId: In(productIds), status: 1 },
      order: { sortOrder: 'ASC' },
    });

    for (const bulkDetail of bulkDetails) {
      const entry = {
        productBulkDetailsId: bulkDetail.id,
        packageQuantity: bulkDetail.packageQuantity,
        ...this.buildPointsInfo(
          bulkDetail.showTotalPoints,
          bulkDetail.showPointsSharing,
          bulkDetail.totalPoints,
          activeRules,
        ),
      };
      const list = byProduct.get(bulkDetail.productId) ?? [];
      list.push(entry);
      byProduct.set(bulkDetail.productId, list);
    }

    return byProduct;
  }

  // Admin adding a product directly — admin is the sole product creator now
  // (no merchant-type users, no merchant_id column). Still starts
  // unpublished (status 0); admin flips it live via update().
  async createByAdmin(dto: CreateProductDto) {
    const product = this.buildProductEntity(dto);

    await this.productRepo.save(product);

    void this.notificationsService.notifyAllUsers({
      categoryName: NotificationCategoryName.PRODUCTS,
      typeName: NotificationTypeName.GENERAL,
      heading: 'New product added',
      subheading: `${product.name} was just added.`,
      route: `/products/${product.id}`,
      data: { productId: product.id },
    });

    return { data: product, message: 'Product created successfully' };
  }

  async findAll(page: number, limit: number, search?: string) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.productMedia', 'productMedia')
      .leftJoinAndSelect('product.paymentOptions', 'paymentOptions')
      .leftJoinAndSelect('paymentOptions.paymentOption', 'paymentOption')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR product.sub_title LIKE :search OR product.description LIKE :search OR product.search_keywords LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [products, total] = await query.getManyAndCount();

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

  async findAllProductsUsers(
    page: number,
    limit: number,
    type?: string,
    search?: string,
  ) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.productMedia', 'media')
      .leftJoinAndSelect('product.paymentOptions', 'paymentOptions')
      .where('product.status = :status', { status: 1 })
      .skip((page - 1) * limit)
      .take(limit);

    // reseller/consumer/partner listings — only products the admin opted
    // into that catalog via the matching *_available column.
    if (type === 'reseller') {
      query.andWhere('product.bulk_available = :bulkAvailable', {
        bulkAvailable: 1,
      });
    } else if (type === 'consumer') {
      query.andWhere('product.consumer_available = :consumerAvailable', {
        consumerAvailable: 1,
      });
    } else if (type === 'partner') {
      query.andWhere('product.partner_available = :partnerAvailable', {
        partnerAvailable: 1,
      });
    }

    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR product.sub_title LIKE :search OR product.description LIKE :search OR product.search_keywords LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [products, total] = await query.getManyAndCount();

    const feedbackByProduct = await this.loadFeedbackByProduct(
      products.map((p) => p.id),
    );

    // Consumer/default: totalPoints/pointsSharing come from the product's
    // own show_total_points/show_points_sharing. Reseller: the same fields
    // instead come from each active bulk package under this product (a
    // reseller buys via a specific package, which can set its own values).
    const activeRules = await this.getActivePointDistributionRules();
    const bulkPointsSharingByProduct =
      type === 'reseller'
        ? await this.loadBulkPointsSharingByProduct(
            products.map((p) => p.id),
            activeRules,
          )
        : new Map<number, any[]>();

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
        consumerAvailable: p.consumerAvailable,
        partnerAvailable: p.partnerAvailable,
        consumerMinimumQuantity: p.consumerMinimumQuantity,
        consumerMaximumQuantity: p.consumerMaximumQuantity,
        resellerMinimumQuantity: p.resellerMinimumQuantity,
        resellerMaximumQuantity: p.resellerMaximumQuantity,
        partnerMinimumQuantity: p.partnerMinimumQuantity,
        partnerMaximumQuantity: p.partnerMaximumQuantity,
        ...(type === 'reseller'
          ? { bulkPointsSharing: bulkPointsSharingByProduct.get(p.id) ?? [] }
          : this.buildPointsInfo(
              p.showTotalPoints,
              p.showPointsSharing,
              p.totalPoints,
              activeRules,
            )),
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

  async findOneProductUsers(id: number, userId: number, type?: string) {
    const product = await this.productRepo.findOne({
      where: {
        id,
        status: 1, // only active products
        // reseller/consumer/partner access — only products opted into the
        // matching catalog via the corresponding *_available column.
        ...(type === 'reseller' ? { bulkAvailable: 1 } : {}),
        ...(type === 'consumer' ? { consumerAvailable: 1 } : {}),
        ...(type === 'partner' ? { partnerAvailable: 1 } : {}),
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

    // Visiting the detail page counts as a view — recorded through the same
    // product_views-backed path as the dedicated POST /product-views/:id
    // endpoint, so view_count is always unique-viewer count either way.
    const {
      data: { viewCount },
    } = await this.productViewsService.recordView(userId, id);

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
      viewCount,
      likeCount: product.likeCount,
      bulkAvailable: product.bulkAvailable,
      consumerAvailable: product.consumerAvailable,
      partnerAvailable: product.partnerAvailable,
      consumerMinimumQuantity: product.consumerMinimumQuantity,
      consumerMaximumQuantity: product.consumerMaximumQuantity,
      resellerMinimumQuantity: product.resellerMinimumQuantity,
      resellerMaximumQuantity: product.resellerMaximumQuantity,
      partnerMinimumQuantity: product.partnerMinimumQuantity,
      partnerMaximumQuantity: product.partnerMaximumQuantity,
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

    // Consumer/default: totalPoints/pointsSharing come from the product's
    // own show_total_points/show_points_sharing. Reseller: the same fields
    // instead come from each active bulk package under this product (a
    // reseller buys via a specific package, which can set its own values).
    const activeRules = await this.getActivePointDistributionRules();
    if (type === 'reseller') {
      const bulkPointsSharingByProduct =
        await this.loadBulkPointsSharingByProduct([product.id], activeRules);
      result.bulkPointsSharing =
        bulkPointsSharingByProduct.get(product.id) ?? [];
    } else {
      Object.assign(
        result,
        this.buildPointsInfo(
          product.showTotalPoints,
          product.showPointsSharing,
          product.totalPoints,
          activeRules,
        ),
      );
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
      ...(dto.consumerAvailable !== undefined && {
        consumerAvailable: dto.consumerAvailable ? 1 : 0,
      }),
      ...(dto.partnerAvailable !== undefined && {
        partnerAvailable: dto.partnerAvailable ? 1 : 0,
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

      void this.notificationsService.notifyAllUsers({
        categoryName: NotificationCategoryName.PRODUCTS,
        typeName: NotificationTypeName.GENERAL,
        heading: 'Product updated',
        subheading: `${dto.name ?? existing.name} was just updated.`,
        route: `/products/${id}`,
        data: { productId: id },
      });
    }

    return { message: 'Product updated successfully' };
  }

  async remove(id: number) {
    await this.productRepo.delete(id);
    return { message: 'Product removed successfully' };
  }
}
