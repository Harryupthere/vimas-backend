import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointTransaction } from '../shared/entities/point-transaction.entity';
import { User } from '../shared/entities/user.entity';
import { PointTransactionService } from './point-transaction.service';
import { PointTransactionAdminController } from './admin/point-transaction.controller';
import { PointTransactionUserController } from './user/point-transaction.controller';
import { PointUserBalance } from 'src/shared/entities/point-user-balance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointTransaction, User,PointUserBalance]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PointTransactionService, JwtStrategy],
  controllers: [
    PointTransactionAdminController,
    PointTransactionUserController,
  ],
})
export class PointTransactionModule {}
