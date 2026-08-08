import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { RewardMallCategory } from '../shared/entities/reward-mall-category.entity';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { CreateRewardMallProductDto } from './dto/create-reward-mall-product.dto';
import { UpdateRewardMallProductDto } from './dto/update-reward-mall-product.dto';

@Injectable()
export class RewardMallProductsService {
  constructor(
    @InjectRepository(RewardMallProduct)
    private readonly productRepo: Repository<RewardMallProduct>,

    @InjectRepository(RewardMallCategory)
    private readonly categoryRepo: Repository<RewardMallCategory>,

    @InjectRepository(RewardMallPurchase)
    private readonly purchaseRepo: Repository<RewardMallPurchase>,

    @InjectRepository(PointUserBalance)
    private readonly pointUserBalanceRepo: Repository<PointUserBalance>,
  ) {}

  // Batch-sums how much of each product this user has already redeemed
  // (points are debited irreversibly at redemption time, so every purchase
  // row counts toward the per-user maximumQuantity cap regardless of its
  // fulfilment status — same rule RewardMallPurchasesService.purchase()
  // enforces). One grouped query for however many products are being shown.
  private async getPurchasedQuantities(
    userId: number,
    productIds: number[],
  ): Promise<Map<number, number>> {
    const purchasedByProduct = new Map<number, number>();
    if (!productIds.length) return purchasedByProduct;

    const rows = await this.purchaseRepo
      .createQueryBuilder('purchase')
      .select('purchase.reward_mall_product_id', 'productId')
      .addSelect('SUM(purchase.quantity)', 'total')
      .where('purchase.user_id = :userId', { userId })
      .andWhere('purchase.reward_mall_product_id IN (:...productIds)', {
        productIds,
      })
      .groupBy('purchase.reward_mall_product_id')
      .getRawMany<{ productId: string; total: string }>();

    for (const row of rows) {
      purchasedByProduct.set(Number(row.productId), Number(row.total));
    }
    return purchasedByProduct;
  }

  private buildProductEntity(dto: CreateRewardMallProductDto) {
    return this.productRepo.create({
      ...dto,
      stockShow: dto.stockShow ? 1 : 0,
      isOutOfStock: dto.isOutOfStock ? 1 : 0,
      labelShow: dto.labelShow ? 1 : 0,
    });
  }

  async create(dto: CreateRewardMallProductDto) {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
    });
    if (!category)
      throw new NotFoundException('Reward mall category not found');

    const product = this.buildProductEntity(dto);
    await this.productRepo.save(product);
    return {
      data: product,
      message: 'Reward mall product created successfully',
    };
  }

  // Admin listing — every status, optional category filter
  async findAll(
    page: number,
    limit: number,
    categoryId?: number,
    status?: number,
    search?: string,
  ) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.media', 'media')
      .orderBy('product.sortOrder', 'ASC')
      .addOrderBy('product.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoryId) {
      query.andWhere('product.category_id = :categoryId', { categoryId });
    }
    if (status !== undefined) {
      query.andWhere('product.status = :status', { status });
    }
    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR product.sub_title LIKE :search OR product.description LIKE :search OR product.search_keywords LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [products, total] = await query.getManyAndCount();

    return {
      data: {
        products,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Reward mall products fetched successfully',
    };
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'media'],
    });
    if (!product) throw new NotFoundException('Reward mall product not found');
    return { data: product, message: 'Reward mall product' };
  }

  // Buyer listing — only active products, optional category filter. When
  // userId is provided, a product this user has already redeemed up to
  // maximumQuantity on is reported as out of stock (for them specifically)
  // so the frontend hides/disables its buy button, same as findOneUsers.
  async findAllUsers(
    page: number,
    limit: number,
    categoryId?: number,
    userId?: number,
    search?: string,
  ) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.media', 'media')
      .where('product.status = :status', { status: 1 })
      .orderBy('product.sortOrder', 'ASC')
      .addOrderBy('product.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoryId) {
      query.andWhere('product.category_id = :categoryId', { categoryId });
    }
    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR product.sub_title LIKE :search OR product.description LIKE :search OR product.search_keywords LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [products, total] = await query.getManyAndCount();

    const purchasedByProduct = userId
      ? await this.getPurchasedQuantities(
          userId,
          products.map((p) => p.id),
        )
      : new Map<number, number>();

    const transformed = products.map((p) => {
      const purchasedQuantity = purchasedByProduct.get(p.id) ?? 0;
      const maxPurchaseReached = purchasedQuantity >= p.maximumQuantity;

      return {
        id: p.id,
        name: p.name,
        subTitle: p.subTitle,
        description: p.description,
        keyPoints: p.keyPoints,
        searchKeywords: p.searchKeywords,
        pointPrice: Number(p.pointPrice),
        minimumQuantity: p.minimumQuantity,
        maximumQuantity: p.maximumQuantity,
        category: p.category?.name,
        media: p.media || [],
        ...(p.stockShow ? { stock: p.stock } : {}),
        ...(p.labelShow
          ? { labelText: p.labelText, labelColor: p.labelColor }
          : {}),
        isOutOfStock: !!p.isOutOfStock || maxPurchaseReached,
        purchasedQuantity,
        maxPurchaseReached,
        viewCount: p.viewCount,
        likeCount: p.likeCount,
      };
    });

    return {
      data: {
        products: transformed,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Reward mall products fetched successfully',
    };
  }

  // Buyer detail — active only, bumps view count, and surfaces whether the
  // requesting user currently has enough points to redeem it (the actual
  // enforcement happens at purchase time in RewardMallPurchasesService —
  // this is just an upfront "can I afford this" preview).
  async findOneUsers(id: number, userId: number) {
    const product = await this.productRepo.findOne({
      where: { id, status: 1 },
      relations: ['category', 'media'],
    });
    if (!product) {
      return { message: 'Reward mall product not found' };
    }

    await this.productRepo.update(id, {
      viewCount: (product.viewCount || 0) + 1,
    });

    const balance = await this.pointUserBalanceRepo.findOne({
      where: { userId },
    });
    const currentPointsBalance = Number(balance?.currentBalance ?? 0);
    const pointsRequired =
      Number(product.pointPrice) * (product.minimumQuantity || 1);

    const purchasedByProduct = await this.getPurchasedQuantities(userId, [
      product.id,
    ]);
    const purchasedQuantity = purchasedByProduct.get(product.id) ?? 0;
    const maxPurchaseReached = purchasedQuantity >= product.maximumQuantity;

    const result: any = {
      id: product.id,
      name: product.name,
      subTitle: product.subTitle,
      description: product.description,
      information: product.information,
      notes: product.notes,
      keyPoints: product.keyPoints,
      details: product.details,
      searchKeywords: product.searchKeywords,
      pointPrice: Number(product.pointPrice),
      minimumQuantity: product.minimumQuantity,
      maximumQuantity: product.maximumQuantity,
      category: product.category?.name,
      media: product.media || [],
      // Reflects this user's own redemption cap, not just the raw product
      // flag — once they've hit maximumQuantity this reads as out of stock
      // for them specifically, same signal the buy button should key off.
      isOutOfStock: !!product.isOutOfStock || maxPurchaseReached,
      purchasedQuantity,
      maxPurchaseReached,
      viewCount: product.viewCount + 1,
      likeCount: product.likeCount,
      currentPointsBalance,
      canAfford:
        !product.isOutOfStock &&
        !maxPurchaseReached &&
        currentPointsBalance >= pointsRequired,
    };

    if (product.stockShow) {
      result.stock = product.stock;
    }
    if (product.labelShow) {
      result.labelText = product.labelText;
      result.labelColor = product.labelColor;
    }

    return { data: result, message: 'Reward mall product' };
  }

  async update(id: number, dto: UpdateRewardMallProductDto) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Reward mall product not found');

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!category)
        throw new NotFoundException('Reward mall category not found');
    }

    const mappedDto: any = {
      ...dto,
      ...(dto.stockShow !== undefined && { stockShow: dto.stockShow ? 1 : 0 }),
      ...(dto.isOutOfStock !== undefined && {
        isOutOfStock: dto.isOutOfStock ? 1 : 0,
      }),
      ...(dto.labelShow !== undefined && { labelShow: dto.labelShow ? 1 : 0 }),
    };

    Object.assign(product, mappedDto);
    await this.productRepo.save(product);
    return {
      data: product,
      message: 'Reward mall product updated successfully',
    };
  }

  async remove(id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Reward mall product not found');

    await this.productRepo.remove(product);
    return { message: 'Reward mall product removed successfully' };
  }
}
