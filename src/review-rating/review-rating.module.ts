import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ReviewRating } from '../shared/entities/review-rating.entity';
import { Order } from '../shared/entities/order.entity';
import { ReviewRatingService } from './review-rating.service';
import { ReviewRatingController } from './user/review-rating.controller';
import { ReviewRatingAdminController } from './admin/review-rating.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewRating, Order]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ReviewRatingService, JwtStrategy],
  controllers: [ReviewRatingController, ReviewRatingAdminController],
})
export class ReviewRatingModule {}
