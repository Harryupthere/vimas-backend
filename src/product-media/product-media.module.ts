import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';

import { ProductMedia } from 'src/shared/entities/product-media.entity';
import { ProductMediaController } from './user/product-media.controller';
import { ProductMediaService } from './product-media.service';
import { Product } from 'src/shared/entities/products.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductMedia, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [ProductMediaController],
  providers: [ProductMediaService, JwtStrategy],
})
export class ProductMediaModule {}
