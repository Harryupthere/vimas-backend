import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';

import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { Permission } from '../shared/entities/permission.entity';
import { RolePermission } from '../shared/entities/role-permission.entity';
import { AdminMenuPermission } from '../shared/entities/admin-menu-permission.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, RolePermission, AdminMenuPermission]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [PermissionService],
  controllers: [PermissionController],
  exports: [PermissionService],
})
export class PermissionModule {}
