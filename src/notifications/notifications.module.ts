import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { Notification } from '../shared/entities/notification.entity';
import { NotificationCategory } from '../shared/entities/notification-category.entity';
import { NotificationType } from '../shared/entities/notification-type.entity';
import { NotificationPreference } from '../shared/entities/notification-preference.entity';
import { User } from '../shared/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsAdminController } from './admin/notifications.controller';
import { NotificationsUserController } from './user/notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationCategory,
      NotificationType,
      NotificationPreference,
      User,
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [NotificationsService, JwtStrategy],
  controllers: [NotificationsAdminController, NotificationsUserController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
