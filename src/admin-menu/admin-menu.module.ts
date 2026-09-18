import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../shared/entities/admin.entity';
import { AdminMenuService } from './admin-menu.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { AdminMenu } from '../shared/entities/admin-menu.entity';
import { AdminRole } from '../shared/entities/admin-role.entity';
import { RolePermission } from '../shared/entities/role-permission.entity';
import { AdminMenuController } from './admin-menu.controller';
import { AdminSidebarController } from './admin-sidebar.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminMenu, AdminRole, RolePermission]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AdminMenuService],
  controllers: [AdminMenuController, AdminSidebarController],
  exports: [AdminMenuService],
})
export class AdminMenuModule {}
