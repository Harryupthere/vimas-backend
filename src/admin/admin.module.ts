import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../shared/entities/admin.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { Role } from '../shared/entities/role.entity';
import { AdminRole } from '../shared/entities/admin-role.entity';
import { PermissionGuard } from '../shared/auth/guards/permission.guard';
import { RolePermission } from '../shared/entities/role-permission.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Role, AdminRole, RolePermission]),

    PassportModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],

  providers: [AdminService, PermissionGuard],

  controllers: [AdminController],

  exports: [AdminService, PermissionGuard],
})
export class AdminModule {}
