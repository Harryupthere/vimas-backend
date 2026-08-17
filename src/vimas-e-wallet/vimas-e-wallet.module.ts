import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { User } from '../shared/entities/user.entity';
import { VimasEWalletTransaction } from '../shared/entities/vimas-e-wallet-transaction.entity';
import { VimasEWalletService } from './vimas-e-wallet.service';
import { WalletAdminController } from './admin/wallet-admin.controller';
import { WalletController } from './user/wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, VimasEWalletTransaction]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [VimasEWalletService, JwtStrategy],
  controllers: [WalletAdminController, WalletController],
  exports: [VimasEWalletService],
})
export class VimasEWalletModule {}
