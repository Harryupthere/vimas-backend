import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import {
  PointTransaction,
  PointTransactionType,
  PointTransactionReason,
  PointWalletType,
} from '../shared/entities/point-transaction.entity';
import { Order } from '../shared/entities/order.entity';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { User } from '../shared/entities/user.entity';

// Matches OrdersService's own (unexported) convention: payment_status id 2
// is "Paid" — the trend graph counts a paid order as a "purchase", not
// every order row (which also includes pending/failed/abandoned ones).
const PAID_PAYMENT_STATUS_ID = 2;

// reward_mall_purchase_status.symbol for the "shipped" state — used to
// count how many of the user's reward-mall redemptions are currently in
// shipping.
const SHIPPED_STATUS_SYMBOL = 'SHIPPED';

// "Recent activities" is a merge of 4 independently-paginated sources
// (orders, reward mall purchases, point transactions, teammate joins) that
// has no single underlying table to ORDER BY/LIMIT against. Rather than
// re-fetching a growing window per requested page (cost scaling with page
// number), each source is capped at its most recent N rows, merged,
// sorted, and paginated in memory — bounded, predictable cost regardless
// of which page is requested. Practically: this is a recency feed, not a
// full history browser — for exhaustive history of one source, the
// dedicated /orders/my, /reward-mall-purchases/my, /point-transaction/my,
// /users/my-team endpoints already page through their single source in
// full.
const RECENT_ACTIVITY_WINDOW = 100;

export interface ActivityItem {
  type: 'order' | 'reward_mall_purchase' | 'point_transaction' | 'teammate';
  id: number;
  heading: string;
  subheading: string;
  amount: number | null;
  route: string;
  createdAt: Date;
  data: Record<string, any>;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PointUserBalance)
    private readonly pointUserBalanceRepo: Repository<PointUserBalance>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepo: Repository<PointTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(RewardMallPurchase)
    private readonly rewardMallPurchaseRepo: Repository<RewardMallPurchase>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // Last 6 calendar months (oldest first), including the current
  // in-progress one — purchases: count of this buyer's paid orders that
  // month; points: sum of points they earned (CREDIT) into their wallet
  // that month. Missing months (no activity) come back as 0, not omitted,
  // so the graph always has a full 6-point line.
  private async getMonthlyTrend(userId: number, walletId: number) {
    const now = new Date();
    // Start of the month 5 months back — together with the current month
    // that's a 6-month window.
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [purchaseRows, pointsRows] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select("DATE_FORMAT(o.created_at, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('o.buyer_id = :userId', { userId })
        .andWhere('o.payment_status_id = :paidStatusId', {
          paidStatusId: PAID_PAYMENT_STATUS_ID,
        })
        .andWhere('o.created_at >= :windowStart', { windowStart })
        .groupBy("DATE_FORMAT(o.created_at, '%Y-%m')")
        .getRawMany<{ month: string; count: string }>(),

      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select("DATE_FORMAT(pt.created_at, '%Y-%m')", 'month')
        .addSelect('COALESCE(SUM(pt.amount), 0)', 'total')
        .where('pt.wallet_id = :walletId', { walletId })
        .andWhere('pt.transaction_type = :transactionType', {
          transactionType: PointTransactionType.CREDIT,
        })
        .andWhere('pt.created_at >= :windowStart', { windowStart })
        .groupBy("DATE_FORMAT(pt.created_at, '%Y-%m')")
        .getRawMany<{ month: string; total: string }>(),
    ]);

    const purchasesByMonth = new Map<string, number>();
    for (const row of purchaseRows) {
      purchasesByMonth.set(row.month, Number(row.count));
    }
    const pointsByMonth = new Map<string, number>();
    for (const row of pointsRows) {
      pointsByMonth.set(row.month, Number(row.total));
    }

    const trend: { m: string; purchases: number; points: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      trend.push({
        m: MONTH_LABELS[monthDate.getMonth()],
        purchases: purchasesByMonth.get(key) ?? 0,
        points: pointsByMonth.get(key) ?? 0,
      });
    }

    return trend;
  }

  // buyer/merchant "dashboard" — wallet snapshot, current-month earn/redeem
  // totals, referral-reward stats, and a 6-month purchases/points trend,
  // all scoped to the logged-in user's own USER wallet only (lazily
  // creates a zeroed wallet row on first visit, same as the "my wallet"
  // endpoint, so brand-new users don't hit a 404).
  async getDashboard(userId: number) {
    let wallet = await this.pointUserBalanceRepo.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = this.pointUserBalanceRepo.create({ userId });
      await this.pointUserBalanceRepo.save(wallet);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Current calendar week, Monday-start: getDay() is 0 (Sun) .. 6 (Sat),
    // so the offset back to Monday is -6 on a Sunday and (1 - day) otherwise.
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + mondayOffset,
    );
    const nextWeekStart = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 7,
    );

    const [
      monthlyEarnedResult,
      monthlyRedeemedResult,
      weeklyEarnedResult,
      weeklyRedeemedResult,
      shippingCount,
      referralRows,
      level1Count,
      level2Count,
      trend,
    ] = await Promise.all([
      // current month earnings (CREDIT)
      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select('COALESCE(SUM(pt.amount), 0)', 'total')
        .where('pt.wallet_id = :walletId', { walletId: wallet.id })
        .andWhere('pt.transaction_type = :transactionType', {
          transactionType: PointTransactionType.CREDIT,
        })
        .andWhere('pt.created_at >= :monthStart', { monthStart })
        .andWhere('pt.created_at < :nextMonthStart', { nextMonthStart })
        .getRawOne(),

      // current month redeemed points (DEBIT)
      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select('COALESCE(SUM(pt.amount), 0)', 'total')
        .where('pt.wallet_id = :walletId', { walletId: wallet.id })
        .andWhere('pt.transaction_type = :transactionType', {
          transactionType: PointTransactionType.DEBIT,
        })
        .andWhere('pt.created_at >= :monthStart', { monthStart })
        .andWhere('pt.created_at < :nextMonthStart', { nextMonthStart })
        .getRawOne(),

      // current week (Mon–Sun) earnings (CREDIT)
      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select('COALESCE(SUM(pt.amount), 0)', 'total')
        .where('pt.wallet_id = :walletId', { walletId: wallet.id })
        .andWhere('pt.transaction_type = :transactionType', {
          transactionType: PointTransactionType.CREDIT,
        })
        .andWhere('pt.created_at >= :weekStart', { weekStart })
        .andWhere('pt.created_at < :nextWeekStart', { nextWeekStart })
        .getRawOne(),

      // current week (Mon–Sun) redeemed points (DEBIT)
      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select('COALESCE(SUM(pt.amount), 0)', 'total')
        .where('pt.wallet_id = :walletId', { walletId: wallet.id })
        .andWhere('pt.transaction_type = :transactionType', {
          transactionType: PointTransactionType.DEBIT,
        })
        .andWhere('pt.created_at >= :weekStart', { weekStart })
        .andWhere('pt.created_at < :nextWeekStart', { nextWeekStart })
        .getRawOne(),

      // reward mall products this user redeemed that are currently in
      // shipping (reward_mall_purchase.status_id -> status "SHIPPED")
      this.rewardMallPurchaseRepo
        .createQueryBuilder('purchase')
        .innerJoin('purchase.status', 'status')
        .where('purchase.user_id = :userId', { userId })
        .andWhere('status.symbol = :symbol', {
          symbol: SHIPPED_STATUS_SYMBOL,
        })
        .getCount(),

      // referral reward point totals, split by level
      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select('pt.transaction_reason', 'transactionReason')
        .addSelect('COALESCE(SUM(pt.amount), 0)', 'total')
        .where('pt.wallet_id = :walletId', { walletId: wallet.id })
        .andWhere('pt.transaction_reason IN (:...reasons)', {
          reasons: [
            PointTransactionReason.REFERRAL_LEVEL_1,
            PointTransactionReason.REFERRAL_LEVEL_2,
          ],
        })
        .groupBy('pt.transaction_reason')
        .getRawMany(),

      // level 1 = number of users who joined with this user as their
      // direct referral
      this.userRepo.count({ where: { referral: { id: userId } } }),

      // level 2 = number of users referred by this user's level-1
      // referrals (referral_id -> a user whose own referral_id = userId)
      this.userRepo
        .createQueryBuilder('u2')
        .innerJoin(User, 'u1', 'u1.id = u2.referral_id')
        .where('u1.referral_id = :userId', { userId })
        .getCount(),

      // last 6 months of purchases (paid orders) + points earned
      this.getMonthlyTrend(userId, wallet.id),
    ]);

    const level1 = referralRows.find(
      (r) => r.transactionReason === PointTransactionReason.REFERRAL_LEVEL_1,
    );
    const level2 = referralRows.find(
      (r) => r.transactionReason === PointTransactionReason.REFERRAL_LEVEL_2,
    );

    const level1Total = Number(level1?.total ?? 0);
    const level2Total = Number(level2?.total ?? 0);

    return {
      data: {
        wallet: {
          id: wallet.id,
          userId: wallet.userId,
          totalCredit: Number(wallet.totalCredit),
          totalDebit: Number(wallet.totalDebit),
          currentBalance: Number(wallet.currentBalance),
        },
        currentMonth: {
          earnedPoints: Number(monthlyEarnedResult.total),
          redeemedPoints: Number(monthlyRedeemedResult.total),
        },
        currentWeek: {
          earnedPoints: Number(weeklyEarnedResult.total),
          redeemedPoints: Number(weeklyRedeemedResult.total),
        },
        rewardProductsInShipping: shippingCount,
        referrals: {
          // count = distinct referred users at that level; total = points
          // this user earned from that level's referral rewards
          level1: { count: level1Count, total: level1Total },
          level2: { count: level2Count, total: level2Total },
          total: {
            count: level1Count + level2Count,
            total: level1Total + level2Total,
          },
        },
        trend,
      },
      message: 'Dashboard fetched successfully',
    };
  }

  // Level 1 = direct referrals of userId; level 2 = referrals of those
  // referrals. Returns the most recently joined RECENT_ACTIVITY_WINDOW
  // across both levels combined, each with a live snapshot of how many
  // points the requesting user has earned from them and how many paid
  // orders they've placed — same computation as UsersService.getMyTeam,
  // just merged across levels instead of split by one.
  private async getRecentTeammates(userId: number): Promise<ActivityItem[]> {
    const level1Users = await this.userRepo.find({
      where: { referral: { id: userId } },
      order: { created_at: 'DESC' },
      take: RECENT_ACTIVITY_WINDOW,
    });
    const level1Ids = level1Users.map((u) => Number(u.id));

    const level2Users = level1Ids.length
      ? await this.userRepo.find({
          where: { referral: { id: In(level1Ids) } },
          relations: ['referral'],
          order: { created_at: 'DESC' },
          take: RECENT_ACTIVITY_WINDOW,
        })
      : [];

    const teammates = [
      ...level1Users.map((u) => ({
        user: u,
        level: 1 as const,
        referrerName: 'You',
      })),
      ...level2Users.map((u) => ({
        user: u,
        level: 2 as const,
        referrerName:
          [u.referral?.first_name, u.referral?.last_name]
            .filter(Boolean)
            .join(' ') ||
          u.referral?.unique_user_id ||
          'your teammate',
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.user.created_at).getTime() -
          new Date(a.user.created_at).getTime(),
      )
      .slice(0, RECENT_ACTIVITY_WINDOW);

    const teammateIds = teammates.map((t) => Number(t.user.id));
    if (!teammateIds.length) return [];

    const [purchaseRows, earningRows] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('order')
        .select('order.buyer_id', 'buyerId')
        .addSelect('COUNT(*)', 'count')
        .where('order.buyer_id IN (:...teammateIds)', { teammateIds })
        .andWhere('order.payment_status_id = :paid', {
          paid: PAID_PAYMENT_STATUS_ID,
        })
        .groupBy('order.buyer_id')
        .getRawMany<{ buyerId: string; count: string }>(),

      this.pointTransactionRepo
        .createQueryBuilder('pt')
        .select('pt.source_user_id', 'sourceUserId')
        .addSelect('SUM(pt.amount)', 'total')
        .where('pt.receiver_user_id = :userId', { userId })
        .andWhere('pt.source_user_id IN (:...teammateIds)', { teammateIds })
        .andWhere('pt.transaction_type = :type', {
          type: PointTransactionType.CREDIT,
        })
        .groupBy('pt.source_user_id')
        .getRawMany<{ sourceUserId: string; total: string }>(),
    ]);

    const purchasesByUser = new Map<number, number>();
    for (const row of purchaseRows) {
      purchasesByUser.set(Number(row.buyerId), Number(row.count));
    }
    const earningsByUser = new Map<number, number>();
    for (const row of earningRows) {
      earningsByUser.set(Number(row.sourceUserId), Number(row.total));
    }

    return teammates.map(({ user, level, referrerName }) => {
      const name =
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.unique_user_id;
      const earnings = earningsByUser.get(Number(user.id)) ?? 0;
      const purchases = purchasesByUser.get(Number(user.id)) ?? 0;

      return {
        type: 'teammate',
        id: Number(user.id),
        heading: `${name} joined your team (Level ${level})`,
        subheading:
          level === 1
            ? `Direct referral · Earned ${earnings} points from ${purchases} purchase(s) so far`
            : `Referred by ${referrerName} · Earned ${earnings} points from ${purchases} purchase(s) so far`,
        amount: earnings,
        route: `/users/my-team?level=${level}`,
        createdAt: user.created_at,
        data: {
          userId: Number(user.id),
          level,
          referrerName,
          pointsEarnedFromThem: earnings,
          productsPurchased: purchases,
        },
      };
    });
  }

  // Single merged, latest-first feed of everything the user would want to
  // see under "recent activity": their own orders, reward mall
  // redemptions, point transactions, and teammates joining their referral
  // network. See RECENT_ACTIVITY_WINDOW for the per-source recency cap
  // this is built from.
  async getRecentActivities(userId: number, page: number, limit: number) {
    const wallet = await this.pointUserBalanceRepo.findOne({
      where: { userId },
    });

    const [orders, purchases, transactions, teammateActivities] =
      await Promise.all([
        this.orderRepo
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.product', 'product')
          .leftJoinAndSelect('order.orderStatus', 'orderStatus')
          .where('order.buyer_id = :userId', { userId })
          // Entity property name, not the raw DB column (`created_at`) —
          // TypeORM's paginated-query-with-joins strategy (skip/take +
          // any join) re-resolves ORDER BY columns via property path, so
          // a raw snake_case name here crashes with "Cannot read
          // properties of undefined (reading 'databaseName')".
          .orderBy('order.createdAt', 'DESC')
          .take(RECENT_ACTIVITY_WINDOW)
          .getMany(),

        this.rewardMallPurchaseRepo
          .createQueryBuilder('purchase')
          .leftJoinAndSelect('purchase.product', 'product')
          .leftJoinAndSelect('purchase.status', 'status')
          .where('purchase.user_id = :userId', { userId })
          .orderBy('purchase.createdAt', 'DESC')
          .take(RECENT_ACTIVITY_WINDOW)
          .getMany(),

        wallet
          ? this.pointTransactionRepo
              .createQueryBuilder('pt')
              .leftJoinAndSelect('pt.sourceUser', 'sourceUser')
              .where('pt.wallet_type = :walletType', {
                walletType: PointWalletType.USER,
              })
              .andWhere('pt.wallet_id = :walletId', { walletId: wallet.id })
              .orderBy('pt.createdAt', 'DESC')
              .take(RECENT_ACTIVITY_WINDOW)
              .getMany()
          : Promise.resolve([]),

        this.getRecentTeammates(userId),
      ]);

    const orderActivities: ActivityItem[] = orders.map((order) => ({
      type: 'order',
      id: order.id,
      heading: `Order placed — ${order.product?.name ?? 'Product'}`,
      subheading: `Qty ${order.quantity} · Status: ${order.orderStatus?.name ?? 'Pending'}`,
      amount: Number(order.totalAmount),
      route: `/orders/my/${order.id}`,
      createdAt: order.createdAt,
      data: {
        orderId: order.id,
        productId: order.productId,
        quantity: order.quantity,
        orderStatus: order.orderStatus?.name ?? null,
      },
    }));

    const purchaseActivities: ActivityItem[] = purchases.map((purchase) => ({
      type: 'reward_mall_purchase',
      id: purchase.id,
      heading: `Redeemed — ${purchase.product?.name ?? 'Reward'}`,
      subheading: `${Number(purchase.pointsRedeemed)} points · Status: ${purchase.status?.name ?? 'Pending'}`,
      amount: Number(purchase.pointsRedeemed),
      route: `/reward-mall-purchases/my/${purchase.id}`,
      createdAt: purchase.createdAt,
      data: {
        purchaseId: purchase.id,
        productId: purchase.rewardMallProductId,
        quantity: purchase.quantity,
        status: purchase.status?.name ?? null,
      },
    }));

    const transactionActivities: ActivityItem[] = transactions.map((t) => {
      const isCredit = t.transactionType === PointTransactionType.CREDIT;
      const sourceName =
        t.sourceUserId && t.sourceUserId !== userId
          ? [t.sourceUser?.first_name, t.sourceUser?.last_name]
              .filter(Boolean)
              .join(' ') ||
            t.sourceUser?.unique_user_id ||
            null
          : null;

      return {
        type: 'point_transaction',
        id: t.id,
        heading: isCredit
          ? `Earned ${Number(t.amount)} points`
          : `Spent ${Number(t.amount)} points`,
        subheading: sourceName
          ? `From ${sourceName}'s purchase — ${t.transactionReason}`
          : t.remarks || t.transactionReason,
        amount: isCredit ? Number(t.amount) : -Number(t.amount),
        route: `/point-transaction/my/${t.id}`,
        createdAt: t.createdAt,
        data: {
          transactionId: t.id,
          transactionType: t.transactionType,
          transactionReason: t.transactionReason,
          sourceUserId: t.sourceUserId,
          orderId: t.orderId,
        },
      };
    });

    const allActivities = [
      ...orderActivities,
      ...purchaseActivities,
      ...transactionActivities,
      ...teammateActivities,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = allActivities.length;
    const start = (page - 1) * limit;
    const paged = allActivities.slice(start, start + limit);

    return {
      data: {
        activities: paged,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Recent activities fetched successfully',
    };
  }
}
