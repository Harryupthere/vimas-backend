import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductView } from '../shared/entities/product-view.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductViewsService } from './product-views.service';
import { ProductViewsController } from './user/product-views.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductView, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductViewsService, JwtStrategy],
  controllers: [ProductViewsController],
  exports: [ProductViewsService],
})
export class ProductViewsModule {}
