import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import {
  PointTransaction,
  PointTransactionType,
  PointTransactionReason,
} from '../shared/entities/point-transaction.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PointUserBalance)
    private readonly pointUserBalanceRepo: Repository<PointUserBalance>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepo: Repository<PointTransaction>,
  ) {}

  // buyer/merchant "dashboard" — wallet snapshot, current-month earn/redeem
  // totals, and referral-reward stats, all scoped to the logged-in user's
  // own USER wallet only (lazily creates a zeroed wallet row on first visit,
  // same as the "my wallet" endpoint, so brand-new users don't hit a 404).
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

    const [monthlyEarnedResult, monthlyRedeemedResult, referralRows] =
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
      },
      message: 'Dashboard fetched successfully',
    };
  }
}
