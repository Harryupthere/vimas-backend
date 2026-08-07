import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import {
  PointTransaction,
  PointTransactionType,
  PointTransactionReason,
} from '../shared/entities/point-transaction.entity';
import { Order } from '../shared/entities/order.entity';

// Matches OrdersService's own (unexported) convention: payment_status id 2
// is "Paid" — the trend graph counts a paid order as a "purchase", not
// every order row (which also includes pending/failed/abandoned ones).
const PAID_PAYMENT_STATUS_ID = 2;

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

    const [monthlyEarnedResult, monthlyRedeemedResult, referralRows, trend] =
      await Promise.all([
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

        // referral reward counts + totals, split by level
        this.pointTransactionRepo
          .createQueryBuilder('pt')
          .select('pt.transaction_reason', 'transactionReason')
          .addSelect('COUNT(*)', 'count')
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

        // last 6 months of purchases (paid orders) + points earned
        this.getMonthlyTrend(userId, wallet.id),
      ]);

    const level1 = referralRows.find(
      (r) => r.transactionReason === PointTransactionReason.REFERRAL_LEVEL_1,
    );
    const level2 = referralRows.find(
      (r) => r.transactionReason === PointTransactionReason.REFERRAL_LEVEL_2,
    );

    const level1Count = Number(level1?.count ?? 0);
    const level1Total = Number(level1?.total ?? 0);
    const level2Count = Number(level2?.count ?? 0);
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
        referrals: {
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
}
