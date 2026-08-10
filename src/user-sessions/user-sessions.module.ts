import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { UserSession } from '../shared/entities/user_session.entity';
import { UserSessionsService } from './user-sessions.service';
import { UserSessionsAdminController } from './admin/user-sessions.controller';
import { UserSessionsUserController } from './user/user-sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSession]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [UserSessionsService, JwtStrategy],
  controllers: [UserSessionsAdminController, UserSessionsUserController],
  exports: [UserSessionsService],
})
export class UserSessionsModule {}
