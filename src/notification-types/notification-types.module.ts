import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { NotificationType } from '../shared/entities/notification-type.entity';
import { NotificationTypesService } from './notification-types.service';
import { NotificationTypesAdminController } from './admin/notification-types.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationType]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [NotificationTypesService, JwtStrategy],
  controllers: [NotificationTypesAdminController],
  exports: [NotificationTypesService],
})
export class NotificationTypesModule {}
