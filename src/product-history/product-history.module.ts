import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ProductHistory } from '../shared/entities/product-history.entity';
import { ProductHistoryService } from './product-history.service';
import { ProductHistoryAdminController } from './admin/product-history.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductHistory]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ProductHistoryService, JwtStrategy],
  controllers: [ProductHistoryAdminController],
  exports: [ProductHistoryService],
})
export class ProductHistoryModule {}
