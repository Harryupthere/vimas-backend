import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../shared/entities/admin.entity';
import { AdminMenuService } from './admin-menu.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { AdminMenu } from '../shared/entities/admin-menu.entity';
import { AdminMenuController } from './admin-menu.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminMenu]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AdminMenuService],
  controllers: [AdminMenuController],
  exports: [AdminMenuService],
})
export class AdminMenuModule {}
