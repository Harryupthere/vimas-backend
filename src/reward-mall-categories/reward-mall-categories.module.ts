import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { RewardMallCategory } from '../shared/entities/reward-mall-category.entity';
import { RewardMallCategoriesService } from './reward-mall-categories.service';
import { RewardMallCategoriesAdminController } from './admin/reward-mall-categories.controller';
import { RewardMallCategoriesUserController } from './user/reward-mall-categories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RewardMallCategory]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RewardMallCategoriesService, JwtStrategy],
  controllers: [
    RewardMallCategoriesAdminController,
    RewardMallCategoriesUserController,
  ],
  exports: [RewardMallCategoriesService],
})
export class RewardMallCategoriesModule {}
