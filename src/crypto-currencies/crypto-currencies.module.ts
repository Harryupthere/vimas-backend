import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { CryptoCurrency } from '../shared/entities/crypto-currency.entity';
import { CryptoCurrenciesService } from './crypto-currencies.service';
import { CryptoCurrenciesAdminController } from './admin/crypto-currencies.controller';
import { CryptoCurrenciesUserController } from './user/crypto-currencies.controller';
import { CoinPaymentsModule } from '../coinpayments/coinpayments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoCurrency]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
    CoinPaymentsModule,
  ],
  providers: [CryptoCurrenciesService, JwtStrategy],
  controllers: [
    CryptoCurrenciesAdminController,
    CryptoCurrenciesUserController,
  ],
  exports: [CryptoCurrenciesService],
})
export class CryptoCurrenciesModule {}
