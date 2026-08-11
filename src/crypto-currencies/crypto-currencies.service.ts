import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoCurrency } from '../shared/entities/crypto-currency.entity';
import { CreateCryptoCurrencyDto } from './dto/create-crypto-currency.dto';
import { UpdateCryptoCurrencyDto } from './dto/update-crypto-currency.dto';
import { CoinPaymentsService } from '../coinpayments/coinpayments.service';
const USDT_CURRENCY = {
  1: '54:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  4: '4:0xdac17f958d2ee523a2206206994597c13d831ec7',
  2: '35:0x55d398326f99059ff775485246999027b3197955',
  3: '9:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
};
@Injectable()
export class CryptoCurrenciesService {
  constructor(
    @InjectRepository(CryptoCurrency)
    private readonly cryptoCurrencyRepo: Repository<CryptoCurrency>,
    private readonly coinPaymentsService: CoinPaymentsService,
  ) {}

  async create(dto: CreateCryptoCurrencyDto) {
    try {
      const cryptoCurrency = this.cryptoCurrencyRepo.create(dto);
      await this.cryptoCurrencyRepo.save(cryptoCurrency);
      return {
        data: cryptoCurrency,
        message: 'Crypto currency created successfully',
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A crypto currency with this coinpaymentId already exists',
        );
      }
      throw err;
    }
  }

  // Admin listing — every status, searchable/paginated
  async findAll(page: number, limit: number, search?: string) {
    const query = this.cryptoCurrencyRepo
      .createQueryBuilder('crypto')
      .orderBy('crypto.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        `(crypto.name LIKE :search
          OR crypto.symbol LIKE :search
          OR crypto.coinpayment_id LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        currencies: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Crypto currencies fetched successfully',
    };
  }

  // Buyer-facing — active coins only, no pagination (a checkout picker
  // list, not a management table), same pattern as brand/notification
  // category "browse" lists.
  async findAllForUsers(search?: string) {
    const query = this.cryptoCurrencyRepo
      .createQueryBuilder('crypto')
      .where('crypto.status = :status', { status: 1 })
      .orderBy('crypto.id', 'ASC');

    if (search) {
      query.andWhere(
        `(crypto.name LIKE :search
          OR crypto.symbol LIKE :search
          OR crypto.coinpayment_id LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Crypto currencies fetched successfully' };
  }

  async findOne(id: number) {
    const cryptoCurrency = await this.cryptoCurrencyRepo.findOne({
      where: { id },
    });
    if (!cryptoCurrency) {
      throw new NotFoundException('Crypto currency not found');
    }
    return { data: cryptoCurrency, message: 'Crypto currency' };
  }

  async update(id: number, dto: UpdateCryptoCurrencyDto) {
    const cryptoCurrency = await this.cryptoCurrencyRepo.findOne({
      where: { id },
    });
    if (!cryptoCurrency) {
      throw new NotFoundException('Crypto currency not found');
    }

    Object.assign(cryptoCurrency, dto);

    try {
      await this.cryptoCurrencyRepo.save(cryptoCurrency);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A crypto currency with this coinpaymentId already exists',
        );
      }
      throw err;
    }
    return {
      data: cryptoCurrency,
      message: 'Crypto currency updated successfully',
    };
  }

  async remove(id: number) {
    const cryptoCurrency = await this.cryptoCurrencyRepo.findOne({
      where: { id },
    });
    if (!cryptoCurrency) {
      throw new NotFoundException('Crypto currency not found');
    }

    await this.cryptoCurrencyRepo.remove(cryptoCurrency);
    return { message: 'Crypto currency removed successfully' };
  }

  // Checkout price helper for the frontend's crypto picker: the cart total
  // is always in the store's fiat currency (MYR), but CoinPayments quotes
  // rates against USDT most reliably, so we hop MYR -> USDT -> selected
  // coin instead of asking for a direct MYR -> coin rate (mirrors the
  // MYR -> coin conversion already done at invoice time in
  // OrdersService.createCoinPaymentsCheckout, just split into two legs).
  async convertAmountToCrypto(amount: number, cryptoCurrencyId: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    const cryptoCurrency = await this.cryptoCurrencyRepo.findOne({
      where: { id: cryptoCurrencyId, status: 1 },
    });
    if (!cryptoCurrency) {
      throw new NotFoundException('Crypto currency not found');
    }

    const baseCurrency = (process.env.STRIPE_CURRENCY || 'MYR').toUpperCase();

    const usdtCurrency = USDT_CURRENCY[cryptoCurrencyId] || 'USDT';
    // // Leg 1: fiat (MYR) -> USDT
    const fiatToUsdtRate = process.env.FIAT_TO_USDT_RATE
      ? parseFloat(process.env.FIAT_TO_USDT_RATE)
      : 0.25;
    const usdtAmount = amount * fiatToUsdtRate;

    // Leg 2: USDT -> selected crypto currency
    const usdtToCryptoRate = await this.coinPaymentsService.getRate(
      usdtCurrency,
      cryptoCurrency.coinpaymentId,
    );
    const decimals = cryptoCurrency.decimalPlaces ?? 8;
    const quantity = Number((usdtAmount * usdtToCryptoRate).toFixed(decimals));

    return {
      data: {
        amount,
        baseCurrency,
        // usdtCurrency,
        usdtAmount: Number(usdtAmount.toFixed(6)),
        cryptoCurrencyId: cryptoCurrency.id,
        cryptoCurrency: cryptoCurrency.coinpaymentId,
        symbol: cryptoCurrency.symbol,
        rate: usdtToCryptoRate,
        quantity,
      },
      message: 'Crypto currency quantity calculated successfully',
    };
  }
}
