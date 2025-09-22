import { Module } from '@nestjs/common';
import { UsersController } from './admin/users.controller';
import { ProfileController } from './user/profile.controller';

import { UsersService } from './users.service';
import { User } from '../shared/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './user/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { UserType } from 'src/shared/entities/user_types.entity';
import { RegistrationType } from 'src/shared/entities/registration_types.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserType, RegistrationType]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [UsersController, AuthController, ProfileController],
  providers: [UsersService, JwtStrategy],
})
export class UsersModule {}
