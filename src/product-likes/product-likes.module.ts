import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductLike } from '../shared/entities/product-like.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductLikesService } from './product-likes.service';
import { ProductLikesController } from './user/product-likes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductLike, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductLikesService, JwtStrategy],
  controllers: [ProductLikesController],
})
export class ProductLikesModule {}
