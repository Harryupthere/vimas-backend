import { PartialType } from '@nestjs/mapped-types';
import { CreateCryptoCurrencyDto } from './create-crypto-currency.dto';

export class UpdateCryptoCurrencyDto extends PartialType(
  CreateCryptoCurrencyDto,
) {}
