import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PointTransaction,
  PointWalletType,
} from '../shared/entities/point-transaction.entity';
import { User } from '../shared/entities/user.entity';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';
import { UpdatePointTransactionDto } from './dto/update-point-transaction.dto';
import { PointUserBalance } from 'src/shared/entities/point-user-balance.entity';
import { PointTransactionType } from 'src/shared/entities/point-transaction.entity';
import { PointTransactionReason } from 'src/shared/entities/point-transaction.entity';
export interface DownlineTreeNode {
  id: number;
  uniqueUserId: string;
  name: string;
  earnedForMe: number;
  subtreeTotal: number;
  children: DownlineTreeNode[];
  directReferralCount: number;
  earnedFromOwnDownline: number;
  earnedForMeDistribution: any;
}

// Safety cap against pathological/cyclic referral data — not a business rule
// (point *rewards* are only 2 levels deep, but this tree visualizes the
// whole downline network, which can legitimately run deeper).
const MAX_DOWNLINE_DEPTH = 20;

@Injectable()
export class PointTransactionService {
  constructor(
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepo: Repository<PointTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PointUserBalance)
    private readonly pointUserBalanceRepo: Repository<PointUserBalance>,
  ) {}

  async create(dto: CreatePointTransactionDto) {
    const pointTransaction = this.pointTransactionRepo.create(dto);
    await this.pointTransactionRepo.save(pointTransaction);
    return {
      data: pointTransaction,
      message: 'Point transaction created successfully',
    };
  }

  async findAll(
    page: number,
    limit: number,
    filters?: { walletType?: string; walletId?: number; search?: string },
  ) {
    const query = this.pointTransactionRepo
      .createQueryBuilder('pt')
      .orderBy('pt.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.walletType) {
      query.andWhere('pt.wallet_type = :walletType', {
        walletType: filters.walletType,
      });
    }
    if (filters?.walletId) {
      query.andWhere('pt.wallet_id = :walletId', {
        walletId: filters.walletId,
      });
    }
    if (filters?.search) {
      query.andWhere(
        '(pt.remarks LIKE :search OR pt.transaction_reason LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        transactions: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Point transactions fetched successfully',
    };
  }

  async findOne(id: number) {
    const pointTransaction = await this.pointTransactionRepo.findOne({
      where: { id },
    });
    if (!pointTransaction)
      throw new NotFoundException('Point transaction not found');
    return { data: pointTransaction, message: 'Point transaction' };
  }

  async update(id: number, dto: UpdatePointTransactionDto) {
    const pointTransaction = await this.pointTransactionRepo.findOne({
      where: { id },
    });
    if (!pointTransaction)
      throw new NotFoundException('Point transaction not found');

    Object.assign(pointTransaction, dto);
    await this.pointTransactionRepo.save(pointTransaction);
    return {
      data: pointTransaction,
      message: 'Point transaction updated successfully',
    };
  }

  async remove(id: number) {
    const pointTransaction = await this.pointTransactionRepo.findOne({
      where: { id },
    });
    if (!pointTransaction)
      throw new NotFoundException('Point transaction not found');

    await this.pointTransactionRepo.remove(pointTransaction);
    return { message: 'Point transaction removed successfully' };
  }

  // Shapes a raw PointTransaction row for the buyer/merchant-facing feed:
  // flags whether it was earned from their own purchase vs a downline
  // member's, surfaces the downline member's public unique_user_id (never
  // raw internal fields), and includes order context instead of a bare id.
  private mapForOwner(t: PointTransaction, ownerId: number) {
    return {
      id: t.id,
      transactionType: t.transactionType,
      transactionReason: t.transactionReason,
      amount: t.amount,
      remarks: t.remarks,
      source: t.sourceUserId === ownerId ? 'self' : 'downline',
      sourceUserId: t.sourceUserId,
      sourceUserUniqueId: t.sourceUser?.unique_user_id ?? null,
      productId: t.productId,
      orderId: t.orderId,
      order: t.order
        ? {
            id: t.order.id,
            quantity: t.order.quantity,
            totalAmount: t.order.totalAmount,
            totalAmountPaid: t.order.totalAmountPaid,
            orderStatusId: t.order.orderStatusId,
            paymentStatusId: t.order.paymentStatusId,
          }
        : null,
      createdAt: t.createdAt,
    };
  }

  // buyer/merchant "my point history" — scoped to their own USER wallet only.
  // Covers both categories in one feed: points earned from their own
  // purchases ("self") and points earned because a downline member
  // purchased something ("downline"), each row tagged accordingly.
  // async findMine(userId: number, page: number, limit: number) {
  //   // here firt find the wallet id of user
  //   // then fetch all transaction where wallet_id == user wallet id

  //   const [data, total] = await this.pointTransactionRepo.findAndCount({
  //     where: { walletType: PointWalletType.USER, walletId: userWalletId },
  //     relations: ['sourceUser', 'order'],
  //     order: { id: 'DESC' },
  //     skip: (page - 1) * limit,
  //     take: limit,
  //   });

  //   return {
  //     data: {
  //       transactions: data.map((t) => this.mapForOwner(t, userId)),
  //       page,
  //       limit,
  //       total,
  //       total_pages: Math.ceil(total / limit),
  //     },
  //     message: 'Point transactions fetched successfully',
  //   };
  // }

  async findMine(userId: number, page: number, limit: number, search?: string) {
    const userWallet = await this.pointUserBalanceRepo.findOne({
      where: {
        userId,
      },
    });

    if (!userWallet) {
      throw new NotFoundException('Point wallet not found');
    }

    const query = this.pointTransactionRepo
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.sourceUser', 'sourceUser')
      .leftJoinAndSelect('pt.order', 'order')
      .where('pt.wallet_type = :walletType', {
        walletType: PointWalletType.USER,
      })
      .andWhere('pt.wallet_id = :walletId', { walletId: Number(userWallet.id) })
      .orderBy('pt.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(pt.remarks LIKE :search OR pt.transaction_reason LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [transactions, total] = await query.getManyAndCount();

    return {
      data: {
        transactions: transactions.map((transaction) =>
          this.mapForOwner(transaction, userId),
        ),
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Point transactions fetched successfully',
    };
  }

  async findOtherTransactionWithOrderId(
    userId: number,
    orderId: number,
    page: number,
    limit: number,
  ) {
    // Optional security check:
    // Verify the order belongs to the logged in user before returning data.

    const transactions = await this.pointTransactionRepo.find({
      where: {
        orderId,
        // Only distributions credited to the buyer or their upline — pool
        // (and admin) wallet entries aren't user-facing, so drop them here
        // rather than fetching pool relations just to filter/strip them below.
        walletType: PointWalletType.USER,
      },
      relations: ['receiverUser', 'pointDistribution'],
      order: {
        id: 'ASC',
      },
    });

    return {
      data: {
        orderId,
        transactions: transactions.map((transaction) => ({
          id: transaction.id,
          walletType: transaction.walletType,
          transactionType: transaction.transactionType,
          transactionReason: transaction.transactionReason,
          amount: transaction.amount,
          remark: transaction.remarks,
          createdAt: transaction.createdAt,

          distribution: transaction.pointDistribution
            ? {
                id: transaction.pointDistribution.id,
                name: transaction.pointDistribution.name,
                description: transaction.pointDistribution.description,
                symbol: transaction.pointDistribution.symbol,
                colour: transaction.pointDistribution.colour,
                eventType: transaction.pointDistribution.eventType,
                receiverType: transaction.pointDistribution.receiverType,
                // rule's configured share — the actual amount credited for
                // this specific transaction is `amount` above
                pointsPercentage:
                  transaction.pointDistribution.pointsPercentage,
              }
            : null,

          user: transaction.receiverUser
            ? {
                id: transaction.receiverUser.id,
                uniqueId: transaction.receiverUser.unique_user_id,
                firstName: transaction.receiverUser.first_name,
                lastName: transaction.receiverUser.last_name,
              }
            : null,
        })),
      },
      message: 'Transaction details fetched successfully',
    };
  }

  async findMineOne(userId: number, id: number) {
    const pointTransaction = await this.pointTransactionRepo.findOne({
      where: { id, walletType: PointWalletType.USER, walletId: userId },
      relations: ['sourceUser', 'order'],
    });
    if (!pointTransaction)
      throw new NotFoundException('Point transaction not found');
    return {
      data: this.mapForOwner(pointTransaction, userId),
      message: 'Point transaction',
    };
  }

  // Builds the requesting user's full downline (referral) tree and, for
  // every member in it, how many points that specific member has earned the
  // requesting user via upline-reward credits from their own purchases.
  // Each node also reports a subtree total (itself + everyone below it), and
  // the response includes a grand total across the whole downline.
  // async getDownlineTree(userId: number) {
  //   const childrenByParent = new Map<number, User[]>();
  //   const allDescendantIds: number[] = [];

  //   let currentLevelIds = [userId];
  //   for (
  //     let depth = 0;
  //     depth < MAX_DOWNLINE_DEPTH && currentLevelIds.length;
  //     depth++
  //   ) {
  //     const children = await this.userRepo.find({
  //       where: { referral: { id: In(currentLevelIds) } },
  //       relations: ['referral'],
  //     });
  //     if (!children.length) break;

  //     for (const child of children) {
  //       const parentId = child.referral.id;
  //       if (!childrenByParent.has(parentId)) {
  //         childrenByParent.set(parentId, []);
  //       }
  //       childrenByParent.get(parentId)!.push(child);
  //       allDescendantIds.push(child.id);
  //     }

  //     currentLevelIds = children.map((c) => c.id);
  //   }

  //   const earningsBySourceUser = new Map<number, number>();
  //   if (allDescendantIds.length) {
  //     const rows = await this.pointTransactionRepo
  //       .createQueryBuilder('t')
  //       .select('t.source_user_id', 'sourceUserId')
  //       .addSelect('SUM(t.amount)', 'total')
  //       .where('t.wallet_type = :walletType', {
  //         walletType: PointWalletType.USER,
  //       })
  //       .andWhere('t.wallet_id = :walletId', { walletId: userId })
  //       .andWhere('t.source_user_id IN (:...ids)', { ids: allDescendantIds })
  //       .groupBy('t.source_user_id')
  //       .getRawMany<{ sourceUserId: string; total: string }>();

  //     for (const row of rows) {
  //       earningsBySourceUser.set(Number(row.sourceUserId), Number(row.total));
  //     }
  //   }

  //   const buildNode = (user: User): DownlineTreeNode => {
  //     const children = (childrenByParent.get(user.id) ?? []).map((c) =>
  //       buildNode(c),
  //     );
  //     const earnedForMe = earningsBySourceUser.get(user.id) ?? 0;
  //     const subtreeTotal =
  //       earnedForMe + children.reduce((sum, c) => sum + c.subtreeTotal, 0);

  //     return {
  //       id: user.id,
  //       uniqueUserId: user.unique_user_id,
  //       name: [user.first_name, user.last_name].filter(Boolean).join(' '),
  //       earnedForMe,
  //       subtreeTotal,
  //       children,
  //     };
  //   };

  //   const downline = (childrenByParent.get(userId) ?? []).map((c) =>
  //     buildNode(c),
  //   );
  //   const totalDownlineEarnings = downline.reduce(
  //     (sum, c) => sum + c.subtreeTotal,
  //     0,
  //   );

  //   return {
  //     data: {
  //       userId,
  //       totalDownlineEarnings,
  //       downline,
  //     },
  //     message: 'Downline tree fetched successfully',
  //   };
  // }

  // async getDownlineTree(userId: number) {
  //   const childrenByParent = new Map<number, User[]>();
  //   const allDescendantIds: number[] = [];

  //   let currentLevelIds = [userId];
  //   for (
  //     let depth = 0;
  //     depth < MAX_DOWNLINE_DEPTH && currentLevelIds.length;
  //     depth++
  //   ) {
  //     const children = await this.userRepo.find({
  //       where: { referral: { id: In(currentLevelIds) } },
  //       relations: ['referral'],
  //     });
  //     if (!children.length) break;

  //     for (const child of children) {
  //       const parentId = child.referral.id;
  //       if (!childrenByParent.has(parentId)) {
  //         childrenByParent.set(parentId, []);
  //       }
  //       childrenByParent.get(parentId)!.push(child);
  //       allDescendantIds.push(child.id);
  //     }

  //     currentLevelIds = children.map((c) => c.id);
  //   }

  //   const earningsBySourceUser = new Map<number, number>();
  //   if (allDescendantIds.length) {
  //     const rows = await this.pointTransactionRepo
  //       .createQueryBuilder('t')
  //       .select('t.source_user_id', 'sourceUserId')
  //       .addSelect('SUM(t.amount)', 'total')
  //       .where('t.receiver_user_id = :userId', { userId })
  //       .andWhere('t.transaction_type = :type', {
  //         type: PointTransactionType.CREDIT,
  //       })
  //       .andWhere('t.source_user_id IN (:...ids)', {
  //         ids: allDescendantIds,
  //       })
  //       .groupBy('t.source_user_id')
  //       .getRawMany();

  //     for (const row of rows) {
  //       earningsBySourceUser.set(Number(row.sourceUserId), Number(row.total));
  //     }
  //     console.log(earningsBySourceUser)
  //   }

  //   const buildNode = (user: User): DownlineTreeNode => {
  //     const children = (childrenByParent.get(user.id) ?? []).map((c) =>
  //       buildNode(c),
  //     );

  //     const earnedForMe = earningsBySourceUser.get(Number(user.id)) ?? 0;

  //     const subtreeTotal =
  //       earnedForMe + children.reduce((sum, c) => sum + c.subtreeTotal, 0);

  //     return {
  //       id: user.id,
  //       uniqueUserId: user.unique_user_id,
  //       name: `${user.first_name} ${user.last_name}`,
  //       earnedForMe,
  //       subtreeTotal,
  //       directReferralCount: children.length,
  //       children,
  //     };
  //   };

  //   const downline = (childrenByParent.get(userId) ?? []).map((c) =>
  //     buildNode(c),
  //   );
  //   const totalDownlineEarnings = downline.reduce(
  //     (sum, c) => sum + c.subtreeTotal,
  //     0,
  //   );

  //   return {
  //     data: {
  //       userId,
  //       totalDownlineEarnings,
  //       downline,
  //     },
  //     message: 'Downline tree fetched successfully',
  //   };
  // }

  async getDownlineTree(userId: number) {
    const childrenByParent = new Map<number, User[]>();
    const allDescendantIds: number[] = [];

    let currentLevelIds = [userId];

    const MAX_CLIENT_DOWNLINE_DEPTH = 2;

    for (
      let depth = 0;
      depth < MAX_CLIENT_DOWNLINE_DEPTH && currentLevelIds.length;
      depth++
    ) {
      const children = await this.userRepo.find({
        where: {
          referral: {
            id: In(currentLevelIds),
          },
        },
        relations: ['referral'],
      });

      if (!children.length) break;

      for (const child of children) {
        const parentId = Number(child.referral.id);

        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, []);
        }

        childrenByParent.get(parentId)!.push(child);

        allDescendantIds.push(Number(child.id));
      }

      currentLevelIds = children.map((c) => Number(c.id));
    }

    /**
     * ------------------------------------------------------------------
     * Map 1
     * How much each descendant earned ME
     * key = sourceUserId
     * value = total points earned for me
     * ------------------------------------------------------------------
     */

    const earningsBySourceUser = new Map<
      number,
      {
        amount: number;
        distribution: {
          id: number;
          name: string;
          description: string;
          symbol: string;
        };
      }
    >();

    /**
     * ------------------------------------------------------------------
     * Map 2
     * source_receiver => amount
     * Example:
     * 4_3 => 20
     * 3_2 => 20
     * 2_1 => 60
     * ------------------------------------------------------------------
     */

    const earningsPairMap = new Map<string, number>();

    if (allDescendantIds.length) {
      const rows = await this.pointTransactionRepo
        .createQueryBuilder('t')
        .leftJoin('t.pointDistribution', 'pd')
        .select('t.source_user_id', 'sourceUserId')
        .addSelect('t.receiver_user_id', 'receiverUserId')
        .addSelect('SUM(t.amount)', 'total')
        .addSelect('pd.id', 'distributionId')
        .addSelect('pd.name', 'distributionName')
        .addSelect('pd.description', 'distributionDescription')
        .addSelect('pd.symbol', 'distributionSymbol')
        .where('t.transaction_type = :type', {
          type: PointTransactionType.CREDIT,
        })
        .andWhere('t.source_user_id IN (:...ids)', {
          ids: allDescendantIds,
        })
        .groupBy('t.source_user_id')
        .addGroupBy('t.receiver_user_id')
        .addGroupBy('pd.id')
        .getRawMany();

      for (const row of rows) {
        const sourceId = Number(row.sourceUserId);
        const receiverId = Number(row.receiverUserId);
        const total = Number(row.total);

        earningsPairMap.set(`${sourceId}_${receiverId}`, total);

        if (receiverId === Number(userId)) {
          earningsBySourceUser.set(sourceId, {
            amount: total,
            distribution: {
              id: Number(row.distributionId),
              name: row.distributionName,
              description: row.distributionDescription,
              symbol: row.distributionSymbol,
            },
          });
        }
      }
    }

    const buildNode = (user: User, currentLevel: number): DownlineTreeNode => {
      // Stop after 2 levels
      const children =
        currentLevel >= 2
          ? []
          : (childrenByParent.get(Number(user.id)) ?? []).map((c) =>
              buildNode(c, currentLevel + 1),
            );

      const earnedData = earningsBySourceUser.get(Number(user.id));

      const earnedForMe = earnedData?.amount ?? 0;

      const earnedForMeDistribution = earnedData?.distribution ?? null;

      let earnedFromOwnDownline = 0;

      for (const child of children) {
        earnedFromOwnDownline +=
          earningsPairMap.get(`${Number(child.id)}_${Number(user.id)}`) ?? 0;
      }

      const subtreeTotal =
        earnedForMe + children.reduce((sum, c) => sum + c.subtreeTotal, 0);

      return {
        id: Number(user.id),
        uniqueUserId: user.unique_user_id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' '),

        earnedForMe,

        earnedForMeDistribution,

        earnedFromOwnDownline,

        subtreeTotal,

        directReferralCount: children.length,

        children,
      };
    };

    const downline = (childrenByParent.get(Number(userId)) ?? []).map((c) =>
      buildNode(c, 1),
    );

    const totalDownlineEarnings = downline.reduce(
      (sum, c) => sum + c.subtreeTotal,
      0,
    );

    return {
      data: {
        userId,
        totalDownlineEarnings,
        downline,
      },
      message: 'Downline tree fetched successfully',
    };
  }
}
