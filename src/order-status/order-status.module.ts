import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { OrderStatus } from '../shared/entities/order-status.entity';
import { OrderStatusService } from './order-status.service';
import { OrderStatusAdminController } from './admin/order-status.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderStatus]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [OrderStatusService, JwtStrategy],
  controllers: [OrderStatusAdminController],
})
export class OrderStatusModule {}
