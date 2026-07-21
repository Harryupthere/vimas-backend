import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { PointPoolDetail } from '../shared/entities/point-pool-detail.entity';
import { PointPoolDetailService } from './point-pool-detail.service';
import { PointPoolDetailAdminController } from './admin/point-pool-detail.controller';
import { PointPoolDetailUserController } from './user/point-pool-detail.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointPoolDetail]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PointPoolDetailService, JwtStrategy],
  controllers: [
    PointPoolDetailAdminController,
    PointPoolDetailUserController,
  ],
})
export class PointPoolDetailModule {}
