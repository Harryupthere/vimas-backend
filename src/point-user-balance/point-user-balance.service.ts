import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointUserBalance } from '../shared/entities/point-user-balance.entity';
import { CreatePointUserBalanceDto } from './dto/create-point-user-balance.dto';
import { UpdatePointUserBalanceDto } from './dto/update-point-user-balance.dto';
import { PointTransactionReason } from '../shared/entities/point-transaction.entity';
import { PointTransactionType } from '../shared/entities/point-transaction.entity';
import { PointTransaction } from '../shared/entities/point-transaction.entity';

@Injectable()
export class PointUserBalanceService {
  constructor(
    @InjectRepository(PointUserBalance)
    private readonly pointUserBalanceRepo: Repository<PointUserBalance>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepo: Repository<PointTransaction>,
  ) {}

  async create(dto: CreatePointUserBalanceDto) {
    try {
      const balance = this.pointUserBalanceRepo.create(dto);
      await this.pointUserBalanceRepo.save(balance);
      return {
        data: balance,
        message: 'Point user balance created successfully',
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A point balance record already exists for this user',
        );
      }
      throw err;
    }
  }

  async findAll(page: number, limit: number, search?: string) {
    const query = this.pointUserBalanceRepo
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.user', 'user')
      .orderBy('balance.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(user.first_name LIKE :search OR user.last_name LIKE :search OR user.email LIKE :search OR user.unique_user_id LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        balances: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Point user balances fetched successfully',
    };
  }

  async findOne(id: number) {
    const balance = await this.pointUserBalanceRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!balance) throw new NotFoundException('Point user balance not found');
    return { data: balance, message: 'Point user balance' };
  }

  async update(id: number, dto: UpdatePointUserBalanceDto) {
    const balance = await this.pointUserBalanceRepo.findOne({ where: { id } });
    if (!balance) throw new NotFoundException('Point user balance not found');

    Object.assign(balance, dto);
    await this.pointUserBalanceRepo.save(balance);
    return {
      data: balance,
      message: 'Point user balance updated successfully',
    };
  }

  async remove(id: number) {
    const balance = await this.pointUserBalanceRepo.findOne({ where: { id } });
    if (!balance) throw new NotFoundException('Point user balance not found');

    await this.pointUserBalanceRepo.remove(balance);
    return { message: 'Point user balance removed successfully' };
  }

  // buyer/merchant "my wallet" view — lazily creates a zeroed row the first
  // time a user checks their balance, so brand-new users don't hit a 404
  async findMine(userId: number) {
    let balance = await this.pointUserBalanceRepo.findOne({
      where: { userId },
    });

    if (!balance) {
      balance = this.pointUserBalanceRepo.create({ userId });
      await this.pointUserBalanceRepo.save(balance);
    }

    const result = await this.pointTransactionRepo
      .createQueryBuilder('pt')
      .select('COALESCE(SUM(pt.amount), 0)', 'total')
      .where('pt.wallet_id = :walletId', { walletId: balance.id })
      .andWhere('pt.receiver_user_id = :userId', { userId })
      .andWhere('pt.transaction_type = :transactionType', {
        transactionType: PointTransactionType.CREDIT,
      })
      .andWhere('pt.transaction_reason = :transactionReason', {
        transactionReason: PointTransactionReason.POOL_DISTRIBUTION,
      })
      .getRawOne();

    return {
      data: {
        ...balance,
        totalPoolDistributionPoints: Number(result.total),
      },
      message: 'Point balance',
    };
  }
}
