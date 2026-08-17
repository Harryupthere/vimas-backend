import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../shared/entities/user.entity';
import {
  VimasEWalletTransaction,
  WalletTransactionCreatedBy,
  WalletTransactionType,
} from '../shared/entities/vimas-e-wallet-transaction.entity';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';

// Reference type stamped on CHECKOUT/REFUND ledger rows created during
// order checkout — see OrdersService.checkout().
export const WALLET_ORDER_SNAPSHOT_REFERENCE = 'order_snapshot';

@Injectable()
export class VimasEWalletService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(VimasEWalletTransaction)
    private readonly walletTxnRepo: Repository<VimasEWalletTransaction>,
  ) {}

  async getBalance(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      data: {
        userId: user.id,
        balance: Number(user.vimasEWalletBalance),
        status: user.vimasEWalletStatus,
      },
      message: 'Wallet balance fetched successfully',
    };
  }

  async findTransactions(userId: number, page: number, limit: number) {
    const [data, total] = await this.walletTxnRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: {
        transactions: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Wallet transactions fetched successfully',
    };
  }

  // Admin: list every user's wallet, paginated/searchable, for an overview
  // screen. Not a monetary operation — no ledger row involved.
  async findAllWallets(page: number, limit: number, search?: string) {
    const query = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.unique_user_id',
        'user.first_name',
        'user.last_name',
        'user.email',
        'user.vimasEWalletBalance',
        'user.vimasEWalletStatus',
      ])
      .orderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        `(user.first_name LIKE :search OR user.last_name LIKE :search
          OR user.email LIKE :search OR user.unique_user_id LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();
    return {
      data: {
        users: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Wallets fetched successfully',
    };
  }

  async setStatus(userId: number, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.vimasEWalletStatus = isActive ? 1 : 0;
    await this.userRepo.save(user);
    return {
      data: { userId: user.id, status: user.vimasEWalletStatus },
      message: `Wallet ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  // Admin-facing credit — opens its own transaction (not part of a larger
  // flow, unlike debitForCheckout/refundForCheckout below).
  async credit(userId: number, dto: CreditWalletDto) {
    return this.userRepo.manager.transaction(async (manager) => {
      const txn = await this.mutateBalance(manager, {
        userId,
        amount: Number(dto.amount),
        type: WalletTransactionType.CREDIT,
        createdBy: WalletTransactionCreatedBy.ADMIN,
        description: dto.description ?? null,
      });
      return { data: txn, message: 'Wallet credited successfully' };
    });
  }

  // Admin-facing debit — same shape as credit(), rejects if it would leave
  // the balance negative.
  async debit(userId: number, dto: DebitWalletDto) {
    return this.userRepo.manager.transaction(async (manager) => {
      const txn = await this.mutateBalance(manager, {
        userId,
        amount: -Number(dto.amount),
        type: WalletTransactionType.DEBIT,
        createdBy: WalletTransactionCreatedBy.ADMIN,
        description: dto.description ?? null,
      });
      return { data: txn, message: 'Wallet debited successfully' };
    });
  }

  // Checkout-time deduction — called by OrdersService.checkout() with the
  // SAME transaction manager it's using for the order/order_snapshot
  // creation, so the wallet debit is atomic with order creation (never
  // committed independently of the order it paid for).
  async debitForCheckout(
    manager: EntityManager,
    userId: number,
    amount: number,
    orderSnapshotId: number,
  ) {
    return this.mutateBalance(manager, {
      userId,
      amount: -amount,
      type: WalletTransactionType.CHECKOUT,
      createdBy: WalletTransactionCreatedBy.USER,
      description: `Wallet applied to order snapshot #${orderSnapshotId}`,
      referenceType: WALLET_ORDER_SNAPSHOT_REFERENCE,
      referenceId: orderSnapshotId,
    });
  }

  // Compensating reversal — used when checkout() has already committed the
  // debit above but the payment gateway session then fails to create, so
  // the order/snapshot get rolled back and the wallet must be restored.
  async refundForCheckout(
    userId: number,
    amount: number,
    orderSnapshotId: number,
  ) {
    return this.userRepo.manager.transaction(async (manager) => {
      return this.mutateBalance(manager, {
        userId,
        amount,
        type: WalletTransactionType.REFUND,
        createdBy: WalletTransactionCreatedBy.SYSTEM,
        description: `Checkout failed — reversing wallet deduction for order snapshot #${orderSnapshotId}`,
        referenceType: WALLET_ORDER_SNAPSHOT_REFERENCE,
        referenceId: orderSnapshotId,
      });
    });
  }

  // Shared core: lock the user row, move the balance by `amount` (positive
  // = credit, negative = debit), reject if it would go negative, save, and
  // write the matching ledger row — all within the caller's transaction
  // manager so balance + ledger + (for checkout) order/snapshot commit or
  // roll back together. Row locking (pessimistic_write) prevents two
  // concurrent operations on the same wallet from both reading the same
  // starting balance.
  private async mutateBalance(
    manager: EntityManager,
    params: {
      userId: number;
      amount: number;
      type: WalletTransactionType;
      createdBy: WalletTransactionCreatedBy;
      description?: string | null;
      referenceType?: string | null;
      referenceId?: number | null;
    },
  ): Promise<VimasEWalletTransaction> {
    const userRepo = manager.getRepository(User);
    const walletTxnRepo = manager.getRepository(VimasEWalletTransaction);

    const user = await userRepo.findOne({
      where: { id: params.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('User not found');

    const balanceBefore = Number(user.vimasEWalletBalance);
    const balanceAfter = balanceBefore + params.amount;

    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${balanceBefore}, requested: ${-params.amount}`,
      );
    }

    user.vimasEWalletBalance = balanceAfter;
    await userRepo.save(user);

    const txn = walletTxnRepo.create({
      userId: params.userId,
      type: params.type,
      amount: Math.abs(params.amount),
      balanceBefore,
      balanceAfter,
      createdBy: params.createdBy,
      description: params.description ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
    });
    return walletTxnRepo.save(txn);
  }
}
