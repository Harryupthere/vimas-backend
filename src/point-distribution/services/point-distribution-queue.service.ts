import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from 'src/shared/entities/admin.entity';
import { User } from 'src/shared/entities/user.entity';
import {
  PointDistributionPurchaseQueue,
  PointDistributionPurchaseQueueStage,
  PointDistributionPurchaseQueueStatus,
} from 'src/shared/entities/point-distribution-purchase-queue.entity';
import {
  PointDistribution,
  PointDistributionStatus,
  PointEventType,
  PointReceiverType,
} from 'src/shared/entities/point-distribution.entity';
import {
  PointPool,
  PointPoolStatus,
} from 'src/shared/entities/point-pool.entity';
import {
  PointTransaction,
  PointTransactionReason,
  PointTransactionType,
  PointWalletType,
} from 'src/shared/entities/point-transaction.entity';
import { PointUserBalance } from 'src/shared/entities/point-user-balance.entity';
import { PointAdminBalance } from 'src/shared/entities/point-admin-balance.entity';
import { Product } from 'src/shared/entities/products.entity';
import { calculateSharedPoints } from 'src/shared/utils/point-sharing.util';
import { EntityManager, Repository } from 'typeorm';

// Order in which a purchase moves through the pipeline. Used purely to
// compare "how far did a previous attempt get" against "what step are we
// about to run", so a crashed/retried job resumes instead of re-crediting
// stages that already completed.
const STAGE_ORDER: PointDistributionPurchaseQueueStage[] = [
  PointDistributionPurchaseQueueStage.CREATED,
  PointDistributionPurchaseQueueStage.BUY_REWARD,
  PointDistributionPurchaseQueueStage.UPLINE_LEVEL_1,
  PointDistributionPurchaseQueueStage.UPLINE_LEVEL_2,
  PointDistributionPurchaseQueueStage.POOL_REWARD,
  PointDistributionPurchaseQueueStage.COMPLETED,
];

const UPLINE_STAGE_BY_RECEIVER: Partial<
  Record<PointReceiverType, PointDistributionPurchaseQueueStage>
> = {
  [PointReceiverType.UPLINE_LEVEL_1]:
    PointDistributionPurchaseQueueStage.UPLINE_LEVEL_1,
  [PointReceiverType.UPLINE_LEVEL_2]:
    PointDistributionPurchaseQueueStage.UPLINE_LEVEL_2,
};

@Injectable()
export class PointDistributionQueueService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    // Also the source of `.manager` for the per-stage transactions below —
    // PointUserBalance/PointAdminBalance/PointPool/PointTransaction are
    // accessed exclusively via `manager.getRepository(...)` inside those
    // transactions now, not injected directly.
    @InjectRepository(PointDistributionPurchaseQueue)
    private readonly pointDistributionPurchaseQueueRepo: Repository<PointDistributionPurchaseQueue>,
    @InjectRepository(PointDistribution)
    private readonly pointDistributionRepo: Repository<PointDistribution>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private readonly logger = new Logger(PointDistributionQueueService.name);

  private stageIndex(stage: PointDistributionPurchaseQueueStage): number {
    return STAGE_ORDER.indexOf(stage);
  }

  async processPurchase(queueId: string): Promise<void> {
    this.logger.log(`[${queueId}] Processing point distribution queue`);

    const entry = await this.pointDistributionPurchaseQueueRepo.findOne({
      where: { id: queueId },
    });

    if (!entry) {
      this.logger.warn(`[${queueId}] Queue entry not found`);
      return;
    }

    this.logger.debug(
      `[${queueId}] Loaded entry: userId=${entry.userId} orderId=${entry.orderId} productId=${entry.productId} quantity=${entry.quantity} status=${entry.status} stage=${entry.stage}`,
    );

    // Idempotency guard: Bull can redeliver a job (crash after completion,
    // manual retry, etc). A completed entry is a no-op.
    if (
      entry.status === PointDistributionPurchaseQueueStatus.COMPLETED ||
      entry.stage === PointDistributionPurchaseQueueStage.COMPLETED
    ) {
      this.logger.log(`[${queueId}] Already completed, skipping`);
      return;
    }

    // Stage reached by the previous attempt (if any) — everything below
    // resumes from here rather than re-crediting already-done steps.
    const resumeFromStage = entry.stage;

    try {
      await this.pointDistributionPurchaseQueueRepo.update(entry.id, {
        status: PointDistributionPurchaseQueueStatus.PROCESSING,
        lastAttemptAt: new Date(),
      });

      const buyer = await this.userRepo.findOne({
        where: { id: Number(entry.userId) },
        relations: ['referral'],
      });
      if (!buyer) {
        throw new Error(`Buyer ${entry.userId} not found`);
      }
      this.logger.debug(
        `[${queueId}] Buyer resolved: id=${buyer.id} uniqueUserId=${buyer.unique_user_id} directUpline=${buyer.referral?.id ?? 'none'}`,
      );

      const activeRules = await this.pointDistributionRepo.find({
        where: {
          eventType: PointEventType.BUY_PRODUCT,
          status: PointDistributionStatus.ACTIVE,
        },
      });

      const buyerRule = activeRules.find(
        (r) => r.receiverType === PointReceiverType.BUYER,
      );
      const poolRule = activeRules.find(
        (r) => r.receiverType === PointReceiverType.POOL,
      );
      // Currently only 2 upline levels are modelled (UPLINE_LEVEL_1/_2 on
      // both the distribution rule's receiver_type and the queue's stage
      // enum); sorted explicitly so level 1 always credits before level 2
      // regardless of DB row order.
      const uplineRules = activeRules
        .filter((r) => r.receiverType in UPLINE_STAGE_BY_RECEIVER)
        .sort((a) =>
          a.receiverType === PointReceiverType.UPLINE_LEVEL_1 ? -1 : 1,
        );

      this.logger.debug(
        `[${queueId}] Active rules (points_percentage): buyer=${buyerRule ? buyerRule.pointsPercentage : 'NONE'} pool=${poolRule ? poolRule.pointsPercentage : 'NONE'} uplines=${uplineRules.map((r) => `${r.receiverType}:${r.pointsPercentage}`).join(',') || 'NONE'}`,
      );

      const quantity = entry.quantity;
      const orderId = Number(entry.orderId);
      const productId = Number(entry.productId);

      const product = await this.productRepo.findOne({
        where: { id: productId },
      });
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }
      // The pool of points a single unit of this product carries — each
      // rule's points_percentage below carves its share out of this, not
      // out of a flat per-rule points value anymore.
      const totalPointsPerUnit = Number(product.totalPoints);

      // Points-per-unit each receiver gets, derived once up front so the
      // per-stage blocks below and the totalPoints sum use identical values.
      const buyerPointsPerUnit = calculateSharedPoints(
        totalPointsPerUnit,
        Number(buyerRule?.pointsPercentage ?? 0),
      );
      const uplinePointsPerUnit = uplineRules.map((r) =>
        calculateSharedPoints(totalPointsPerUnit, Number(r.pointsPercentage)),
      );
      const poolPointsPerUnit = calculateSharedPoints(
        totalPointsPerUnit,
        Number(poolRule?.pointsPercentage ?? 0),
      );

      const totalPoints =
        quantity *
        (buyerPointsPerUnit +
          uplinePointsPerUnit.reduce((sum, p) => sum + p, 0) +
          poolPointsPerUnit);

      this.logger.debug(
        `[${queueId}] quantity=${quantity} productTotalPoints=${totalPointsPerUnit} totalPoints=${totalPoints} resumeFromStage=${resumeFromStage}`,
      );

      // Only set once, the first time this entry is ever processed — a
      // resumed retry must not recompute/reset it.
      if (resumeFromStage === PointDistributionPurchaseQueueStage.CREATED) {
        await this.pointDistributionPurchaseQueueRepo.update(entry.id, {
          totalPoints: totalPoints.toString(),
          remainingPoints: totalPoints.toString(),
        });
      }

      // --- Buyer reward ---------------------------------------------------
      if (
        this.stageIndex(resumeFromStage) <
        this.stageIndex(PointDistributionPurchaseQueueStage.BUY_REWARD)
      ) {
        if (buyerRule) {
          const amount = quantity * buyerPointsPerUnit;
          this.logger.debug(
            `[${queueId}] Crediting buyer reward: userId=${buyer.id} amount=${amount}`,
          );
          // Credit + stage-advance happen in ONE transaction: if the advance
          // half fails for any reason, the credit half rolls back with it,
          // so a retry can never see "already credited, stage not advanced"
          // and re-credit the same reward again.
          await this.pointDistributionPurchaseQueueRepo.manager.transaction(
            async (manager) => {
              await this.creditUserWallet(
                manager,
                buyer.id,
                amount,
                orderId,
                productId,
                buyerRule.id,
                `Buyer reward for order #${orderId}`,
                buyer.id,
              );
              await this.advanceStage(
                manager,
                entry.id,
                PointDistributionPurchaseQueueStage.BUY_REWARD,
                amount,
              );
            },
          );
        } else {
          this.logger.warn(
            `[${queueId}] No active BUY_PRODUCT/BUYER point distribution rule configured — skipping buyer reward`,
          );
          await this.advanceStage(
            this.pointDistributionPurchaseQueueRepo.manager,
            entry.id,
            PointDistributionPurchaseQueueStage.BUY_REWARD,
            0,
          );
        }
      }

      // --- Upline levels ---------------------------------------------------
      // The chain is derived fresh from the referral graph every run (not a
      // pointer carried across loop iterations) so that resuming after a
      // partial failure — where level 1 was skipped because it's already
      // done — still computes level 2's recipient correctly.
      const uplineChain: (number | null)[] = [];
      let cursor: number | null = buyer.id;
      for (let i = 0; i < uplineRules.length; i++) {
        if (cursor === null) {
          uplineChain.push(null);
          continue;
        }
        const cursorUser = await this.userRepo.findOne({
          where: { id: cursor },
          relations: ['referral'],
        });
        const uplineId = cursorUser?.referral?.id ?? null;
        uplineChain.push(uplineId);
        cursor = uplineId;
      }
      this.logger.debug(
        `[${queueId}] Resolved upline chain (level -> userId|null): ${uplineChain.map((id, i) => `L${i + 1}=${id ?? 'none'}`).join(', ') || 'no upline levels configured'}`,
      );

      let fallbackAdmin: Admin | null = null;

      for (let i = 0; i < uplineRules.length; i++) {
        const rule = uplineRules[i];
        const stageForRule = UPLINE_STAGE_BY_RECEIVER[rule.receiverType]!;

        if (this.stageIndex(resumeFromStage) >= this.stageIndex(stageForRule)) {
          continue; // already credited on a previous attempt
        }

        const amount = quantity * uplinePointsPerUnit[i];
        const uplineUserId = uplineChain[i];

        if (uplineUserId) {
          this.logger.debug(
            `[${queueId}] Crediting upline ${rule.receiverType}: userId=${uplineUserId} amount=${amount}`,
          );
          await this.pointDistributionPurchaseQueueRepo.manager.transaction(
            async (manager) => {
              await this.creditUserWallet(
                manager,
                uplineUserId,
                amount,
                orderId,
                productId,
                rule.id,
                `Upline reward (${rule.receiverType}) for order #${orderId}`,
                buyer.id,
              );
              await this.advanceStage(manager, entry.id, stageForRule, amount);
            },
          );
        } else {
          // No upline at this level (buyer — or an ancestor — joined with no
          // referrer): this level, and by construction every level after it
          // in the chain, falls back to the admin account.
          if (!fallbackAdmin) {
            fallbackAdmin = await this.getFallbackAdmin();
          }
          this.logger.debug(
            `[${queueId}] No upline at ${rule.receiverType} — falling back to admin id=${fallbackAdmin.id}, amount=${amount}`,
          );
          const adminId = fallbackAdmin.id;
          await this.pointDistributionPurchaseQueueRepo.manager.transaction(
            async (manager) => {
              await this.creditAdminWallet(
                manager,
                adminId,
                amount,
                orderId,
                productId,
                rule.id,
                buyer.id,
                `Fallback admin reward (${rule.receiverType}, no upline present) for order #${orderId}`,
              );
              await this.advanceStage(manager, entry.id, stageForRule, amount);
            },
          );
        }
      }

      // --- Pool reward ------------------------------------------------------
      if (
        this.stageIndex(resumeFromStage) <
        this.stageIndex(PointDistributionPurchaseQueueStage.POOL_REWARD)
      ) {
        if (poolRule) {
          const amount = quantity * poolPointsPerUnit;
          this.logger.debug(`[${queueId}] Crediting pool: amount=${amount}`);
          await this.pointDistributionPurchaseQueueRepo.manager.transaction(
            async (manager) => {
              const credited = await this.creditActivePool(
                manager,
                amount,
                orderId,
                productId,
                poolRule.id,
                buyer.id,
                `Pool contribution for order #${orderId}`,
              );
              await this.advanceStage(
                manager,
                entry.id,
                PointDistributionPurchaseQueueStage.POOL_REWARD,
                credited ? amount : 0,
              );
            },
          );
        } else {
          await this.advanceStage(
            this.pointDistributionPurchaseQueueRepo.manager,
            entry.id,
            PointDistributionPurchaseQueueStage.POOL_REWARD,
            0,
          );
        }
      }

      await this.pointDistributionPurchaseQueueRepo.update(entry.id, {
        status: PointDistributionPurchaseQueueStatus.COMPLETED,
        stage: PointDistributionPurchaseQueueStage.COMPLETED,
        remainingPoints: '0',
        processedAt: new Date(),
      });
      this.logger.log(`[${queueId}] Completed`);
    } catch (err) {
      this.logger.error(
        `[${queueId}] Failed at stage=${resumeFromStage}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );
      await this.pointDistributionPurchaseQueueRepo.update(entry.id, {
        status: PointDistributionPurchaseQueueStatus.FAILED,
        error: err instanceof Error ? err.message : String(err),
        retryCount: entry.retryCount + 1,
        lastAttemptAt: new Date(),
      });
      // rethrow so Bull's configured attempts/backoff actually retries the job
      throw err;
    }
  }

  private async advanceStage(
    manager: EntityManager,
    entryId: string,
    stage: PointDistributionPurchaseQueueStage,
    pointsSpent: number,
  ) {
    const queueRepo = manager.getRepository(PointDistributionPurchaseQueue);
    const current = await queueRepo.findOne({ where: { id: entryId } });
    const remaining = Math.max(
      Number(current?.remainingPoints ?? 0) - pointsSpent,
      0,
    );
    await queueRepo.update(entryId, {
      stage,
      remainingPoints: remaining.toString(),
    });
    this.logger.debug(
      `[${entryId}] Advanced to stage=${stage}, spent=${pointsSpent}, remainingPoints=${remaining}`,
    );
  }

  private async getFallbackAdmin(): Promise<Admin> {
    const [admin] = await this.adminRepo.find({
      order: { id: 'ASC' },
      take: 1,
    });
    if (!admin) {
      throw new Error('No admin account configured to receive fallback points');
    }
    return admin;
  }

  private async creditUserWallet(
    manager: EntityManager,
    userId: number,
    points: number,
    orderId: number,
    productId: number,
    pointDistributionId: number,
    remark: string,
    sourceUserId: number,
  ) {
    if (points <= 0) return;

    const balanceRepo = manager.getRepository(PointUserBalance);
    const transactionRepo = manager.getRepository(PointTransaction);

    let balance = await balanceRepo.findOne({ where: { userId } });

    if (!balance) {
      // `create({ userId })` alone leaves totalCredit/totalDebit/
      // currentBalance as `undefined` in memory — the entity's `default: 0`
      // is a DB-level default that only applies when a column is *omitted*
      // from the INSERT. `Number(undefined) + points` is NaN, so the row
      // would get created with NaN written into a DECIMAL column. Seed the
      // numeric fields to 0 explicitly so they're real numbers first.
      balance = balanceRepo.create({
        userId,
        totalCredit: 0,
        totalDebit: 0,
        currentBalance: 0,
      });
      this.logger.debug(
        `creditUserWallet: no existing balance for userId=${userId}, creating new row`,
      );
    } else {
      this.logger.debug(
        `creditUserWallet: existing balance for userId=${userId} — totalCredit=${balance.totalCredit} currentBalance=${balance.currentBalance}`,
      );
    }

    balance.totalCredit = Number(balance.totalCredit) + points;
    balance.currentBalance = Number(balance.currentBalance) + points;
    await balanceRepo.save(balance);

    this.logger.debug(
      `creditUserWallet: userId=${userId} credited +${points} -> totalCredit=${balance.totalCredit} currentBalance=${balance.currentBalance}`,
    );

    await transactionRepo.save(
      transactionRepo.create({
        walletType: PointWalletType.USER,
        walletId: balance.id,
        transactionType: PointTransactionType.CREDIT,
        transactionReason: PointTransactionReason.BUY_PRODUCT,
        sourceUserId: sourceUserId,
        receiverUserId: userId,
        productId,
        orderId,
        pointDistributionId,
        amount: points,
        remarks: remark,
      }),
    );
  }

  private async creditAdminWallet(
    manager: EntityManager,
    adminId: number,
    points: number,
    orderId: number,
    productId: number,
    pointDistributionId: number,
    sourceUserId: number,
    remark: string,
  ) {
    if (points <= 0) return;

    const balanceRepo = manager.getRepository(PointAdminBalance);
    const transactionRepo = manager.getRepository(PointTransaction);

    let balance = await balanceRepo.findOne({ where: { adminId } });
    if (!balance) {
      // same fix as creditUserWallet — seed to 0 so the +points arithmetic
      // below doesn't produce NaN on a brand-new row
      balance = balanceRepo.create({
        adminId,
        totalCredit: 0,
        totalDebit: 0,
        currentBalance: 0,
      });
      this.logger.debug(
        `creditAdminWallet: no existing balance for adminId=${adminId}, creating new row`,
      );
    } else {
      this.logger.debug(
        `creditAdminWallet: existing balance for adminId=${adminId} — totalCredit=${balance.totalCredit} currentBalance=${balance.currentBalance}`,
      );
    }

    balance.totalCredit = Number(balance.totalCredit) + points;
    balance.currentBalance = Number(balance.currentBalance) + points;
    await balanceRepo.save(balance);

    this.logger.debug(
      `creditAdminWallet: adminId=${adminId} credited +${points} -> totalCredit=${balance.totalCredit} currentBalance=${balance.currentBalance}`,
    );

    await transactionRepo.save(
      transactionRepo.create({
        walletType: PointWalletType.ADMIN,
        walletId: balance.id,
        transactionType: PointTransactionType.CREDIT,
        transactionReason: PointTransactionReason.BUY_PRODUCT,
        sourceUserId,
        receiverAdminId: adminId,
        productId,
        orderId,
        pointDistributionId,
        amount: points,
        remarks: remark,
      }),
    );
  }

  // Returns false (and credits nothing) if there's no active pool to receive
  // the points — deliberately non-fatal so a missing pool config doesn't fail
  // the whole purchase's point distribution; it's logged for follow-up.
  private async creditActivePool(
    manager: EntityManager,
    points: number,
    orderId: number,
    productId: number,
    pointDistributionId: number,
    sourceUserId: number,
    remark: string,
  ): Promise<boolean> {
    if (points <= 0) return false;

    const poolRepo = manager.getRepository(PointPool);
    const transactionRepo = manager.getRepository(PointTransaction);

    const pool = await poolRepo.findOne({
      where: { status: PointPoolStatus.ACTIVE },
      order: { id: 'DESC' },
    });
    if (!pool) {
      this.logger.warn(
        `No active point pool found — skipping pool credit for order #${orderId}`,
      );
      return false;
    }

    pool.totalCredit = Number(pool.totalCredit) + points;
    pool.currentBalance = Number(pool.currentBalance) + points;
    // pool.distributedPoints = Number(pool.distributedPoints) + points;
    await poolRepo.save(pool);

    this.logger.debug(
      `creditActivePool: poolId=${pool.id} credited +${points} -> totalCredit=${pool.totalCredit} currentBalance=${pool.currentBalance}`,
    );

    await transactionRepo.save(
      transactionRepo.create({
        walletType: PointWalletType.POOL,
        walletId: pool.id,
        transactionType: PointTransactionType.CREDIT,
        transactionReason: PointTransactionReason.BUY_PRODUCT,
        sourceUserId,
        productId,
        orderId,
        pointDistributionId,
        poolId: pool.id,
        amount: points,
        remarks: remark,
      }),
    );

    return true;
  }
}
