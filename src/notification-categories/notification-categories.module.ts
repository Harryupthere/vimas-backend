import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { NotificationCategory } from '../shared/entities/notification-category.entity';
import { NotificationCategoriesService } from './notification-categories.service';
import { NotificationCategoriesAdminController } from './admin/notification-categories.controller';
import { NotificationCategoriesUserController } from './user/notification-categories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationCategory]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [NotificationCategoriesService, JwtStrategy],
  controllers: [
    NotificationCategoriesAdminController,
    NotificationCategoriesUserController,
  ],
  exports: [NotificationCategoriesService],
})
export class NotificationCategoriesModule {}
