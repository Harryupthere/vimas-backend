import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointPool } from '../shared/entities/point-pool.entity';
import { PointPoolService } from './point-pool.service';
import { PointPoolAdminController } from './admin/point-pool.controller';
import { PointPoolUserController } from './user/point-pool.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointPool]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PointPoolService, JwtStrategy],
  controllers: [PointPoolAdminController, PointPoolUserController],
})
export class PointPoolModule {}
