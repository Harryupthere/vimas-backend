import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/shared/entities/user.entity';
import { Cart } from 'src/shared/entities/cart.entity';
import { Product } from 'src/shared/entities/products.entity';
import { CartService } from './cart.service';
import { CartController } from './user/cart.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, User, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [CartService, JwtStrategy],
  controllers: [CartController],
})
export class CartModule {}
