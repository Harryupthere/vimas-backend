import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import {
  PointTransaction,
  PointTransactionReason,
  PointTransactionType,
  PointWalletType,
} from '../shared/entities/point-transaction.entity';
import { CreateRewardMallPurchaseDto } from './dto/create-reward-mall-purchase.dto';
import { AdminUpdateRewardMallPurchaseDto } from './dto/admin-update-reward-mall-purchase.dto';

// Convention shared with orders (order_status_id/payment_status_id default
// to 1): the first admin-seeded reward_mall_purchase_status row is treated
// as the initial/pending state for a freshly redeemed purchase.
const DEFAULT_PURCHASE_STATUS_ID = 1;

@Injectable()
export class RewardMallPurchasesService {
  constructor(
    @InjectRepository(RewardMallPurchase)
    private readonly purchaseRepo: Repository<RewardMallPurchase>,

    @InjectRepository(RewardMallProduct)
    private readonly productRepo: Repository<RewardMallProduct>,
  ) {}

  // PointUserBalance/PointTransaction are accessed exclusively via
  // `manager.getRepository(...)` inside the transaction below (same
  // pattern as PointDistributionQueueService) — no repo injection needed
  // for them since they're never touched outside a transaction.

  // Buyer redeeming reward points for a reward mall product. Validates the
  // product is purchasable (active, in stock, quantity within bounds) and
  // that the buyer's current point balance covers the cost — pulled from
  // PointUserBalance, the same wallet BUY_PRODUCT rewards credit into —
  // then atomically debits the wallet, records a PointTransaction, and
  // creates the purchase row.
  async purchase(userId: number, dto: CreateRewardMallPurchaseDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.rewardMallProductId, status: 1 },
    });
    if (!product) {
      throw new NotFoundException('Reward mall product not found');
    }

    if (product.isOutOfStock) {
      throw new BadRequestException('This reward is currently out of stock');
    }

    const quantity = dto.quantity ?? product.minimumQuantity ?? 1;
    if (quantity < product.minimumQuantity) {
      throw new BadRequestException(
        `Minimum quantity for this reward is ${product.minimumQuantity}`,
      );
    }
    if (quantity > product.maximumQuantity) {
      throw new BadRequestException(
        `Maximum quantity for this reward is ${product.maximumQuantity}`,
      );
    }

    const pointsRequired = Number(product.pointPrice) * quantity;

    return this.purchaseRepo.manager.transaction(async (manager) => {
      const balanceRepo = manager.getRepository(PointUserBalance);
      const transactionRepo = manager.getRepository(PointTransaction);
      const purchaseRepo = manager.getRepository(RewardMallPurchase);

      // Lock the balance row for the duration of this transaction so two
      // concurrent redemptions from the same wallet can't both pass the
      // affordability check against the same starting balance. This also
      // serializes the per-user quantity check below against a second
      // concurrent redemption of the same reward by the same user.
      const balance = await balanceRepo.findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      // maximumQuantity is a per-user lifetime cap, not just a per-request
      // bound — sum every purchase this user has already made of this
      // reward. Points are debited irreversibly at redemption time (see the
      // comment on update() below), so every row here counts toward the
      // cap regardless of its later fulfilment status.
      const alreadyPurchasedRow = await purchaseRepo
        .createQueryBuilder('purchase')
        .select('COALESCE(SUM(purchase.quantity), 0)', 'total')
        .where('purchase.user_id = :userId', { userId })
        .andWhere('purchase.reward_mall_product_id = :productId', {
          productId: product.id,
        })
        .getRawOne<{ total: string }>();
      const alreadyPurchasedQty = Number(alreadyPurchasedRow?.total ?? 0);

      if (alreadyPurchasedQty >= product.maximumQuantity) {
        throw new BadRequestException(
          `You have already redeemed the maximum allowed quantity (${product.maximumQuantity}) of this reward.`,
        );
      }
      if (alreadyPurchasedQty + quantity > product.maximumQuantity) {
        throw new BadRequestException(
          `You can redeem at most ${product.maximumQuantity - alreadyPurchasedQty} more of this reward (limit ${product.maximumQuantity} per user).`,
        );
      }

      const currentBalance = Number(balance?.currentBalance ?? 0);
      if (!balance || currentBalance < pointsRequired) {
        throw new BadRequestException(
          `Insufficient points. You have ${currentBalance} points, this reward requires ${pointsRequired} points.`,
        );
      }

      balance.totalDebit = Number(balance.totalDebit) + pointsRequired;
      balance.currentBalance = currentBalance - pointsRequired;
      await balanceRepo.save(balance);

      await transactionRepo.save(
        transactionRepo.create({
          walletType: PointWalletType.USER,
          walletId: balance.id,
          transactionType: PointTransactionType.DEBIT,
          // No dedicated DB enum value exists yet for reward mall
          // redemptions (point_transactions.transaction_reason is a MySQL
          // ENUM column — adding one needs an ALTER, out of scope here).
          // OTHER + a descriptive remark stands in until that's added.
          transactionReason: PointTransactionReason.OTHER,
          sourceUserId: userId,
          receiverUserId: userId,
          amount: pointsRequired,
          remarks: `Reward Mall redemption: ${quantity} x "${product.name}" (reward_mall_product #${product.id})`,
        }),
      );

      const purchase = purchaseRepo.create({
        userId,
        rewardMallProductId: product.id,
        quantity,
        pointsRedeemed: pointsRequired,
        statusId: DEFAULT_PURCHASE_STATUS_ID,
        userRemark: dto.userRemark ?? null,
      });
      const saved = await purchaseRepo.save(purchase);

      return { data: saved, message: 'Reward redeemed successfully' };
    });
  }

  async findMine(userId: number, page: number, limit: number, search?: string) {
    const query = this.purchaseRepo
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.product', 'product')
      .leftJoinAndSelect('purchase.status', 'status')
      .where('purchase.user_id = :userId', { userId })
      .orderBy('purchase.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR purchase.tracking_number LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        purchases: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Your reward mall purchases fetched successfully',
    };
  }

  async findMineOne(userId: number, id: number) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id, userId },
      relations: ['product', 'status'],
    });
    if (!purchase) {
      throw new NotFoundException('Reward mall purchase not found');
    }
    return { data: purchase, message: 'Reward mall purchase' };
  }

  // Admin
  async findAll(
    page: number,
    limit: number,
    filters?: { userId?: number; statusId?: number; search?: string },
  ) {
    const query = this.purchaseRepo
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.user', 'user')
      .leftJoinAndSelect('purchase.product', 'product')
      .leftJoinAndSelect('purchase.status', 'status')
      .orderBy('purchase.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.userId) {
      query.andWhere('purchase.user_id = :userId', { userId: filters.userId });
    }
    if (filters?.statusId) {
      query.andWhere('purchase.status_id = :statusId', {
        statusId: filters.statusId,
      });
    }
    if (filters?.search) {
      query.andWhere(
        `(product.name LIKE :search
          OR purchase.tracking_number LIKE :search
          OR user.first_name LIKE :search
          OR user.last_name LIKE :search
          OR user.email LIKE :search
          OR user.unique_user_id LIKE :search)`,
        { search: `%${filters.search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        purchases: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Reward mall purchases fetched successfully',
    };
  }

  async findOne(id: number) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['user', 'product', 'status'],
    });
    if (!purchase) {
      throw new NotFoundException('Reward mall purchase not found');
    }
    return { data: purchase, message: 'Reward mall purchase' };
  }

  // Admin updates fulfilment details (status/tracking/remarks). Points are
  // never re-touched here — the debit already happened at redemption time
  // in purchase() above; this is fulfilment bookkeeping only.
  async update(id: number, dto: AdminUpdateRewardMallPurchaseDto) {
    const purchase = await this.purchaseRepo.findOne({ where: { id } });
    if (!purchase) {
      throw new NotFoundException('Reward mall purchase not found');
    }

    if (dto.adminRemark && dto.adminRemark.length) {
      const existing = purchase.adminRemark ?? [];
      purchase.adminRemark = [...existing, ...dto.adminRemark];
    }

    if (dto.statusId !== undefined) purchase.statusId = dto.statusId;
    if (dto.trackingNumber !== undefined) {
      purchase.trackingNumber = dto.trackingNumber;
    }
    if (dto.deliveredAt !== undefined) {
      purchase.deliveredAt = new Date(dto.deliveredAt);
    }

    await this.purchaseRepo.save(purchase);
    return {
      data: purchase,
      message: 'Reward mall purchase updated successfully',
    };
  }
}
