import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminRole } from '../entities/admin-role.entity';
import { RolePermission } from '../entities/role-permission.entity';

import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionGuard } from './guards/permission.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AdminRole, RolePermission])],

  providers: [JwtStrategy, PermissionGuard],

  exports: [
    JwtStrategy,
    PermissionGuard,

    // Export the TypeORM repository providers
    TypeOrmModule,
  ],
})
export class AuthModule {}
