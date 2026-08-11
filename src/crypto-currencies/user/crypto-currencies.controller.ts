import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CryptoCurrenciesService } from '../crypto-currencies.service';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';
import { ConvertCryptoCurrencyDto } from '../dto/convert-crypto-currency.dto';

// Buyer-facing coin picker for the CoinPayments checkout step.
@UseGuards(JwtAuthGuard)
@Controller('crypto-currencies')
export class CryptoCurrenciesUserController {
  constructor(
    private readonly cryptoCurrenciesService: CryptoCurrenciesService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.cryptoCurrenciesService.findAllForUsers(search);
  }

  // Checkout price helper: given the cart total in MYR and a chosen coin,
  // returns how much of that coin the buyer needs to pay — converts
  // MYR -> USDT -> selected crypto currency, same rate hops the invoice
  // itself will use, so the number shown at checkout matches what
  // CoinPayments ultimately bills.
  @Get('convert')
  convert(@Query() dto: ConvertCryptoCurrencyDto) {
    return this.cryptoCurrenciesService.convertAmountToCrypto(
      dto.amount,
      dto.cryptoCurrencyId,
    );
  }
}
