import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductFeedback } from '../shared/entities/product-feedback.entity';
import { ProductFeedbackLike } from '../shared/entities/product-feedback-like.entity';
import { Product } from '../shared/entities/products.entity';
import { ProductFeedbackService } from './product-feedback.service';
import { ProductFeedbackController } from './user/product-feedback.controller';
import { ProductFeedbackAdminController } from './admin/product-feedback.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductFeedback, ProductFeedbackLike, Product]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductFeedbackService, JwtStrategy],
  controllers: [ProductFeedbackController, ProductFeedbackAdminController],
})
export class ProductFeedbackModule {}
