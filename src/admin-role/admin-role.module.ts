import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../shared/entities/admin.entity';
import { Role } from '../shared/entities/role.entity';
import { AdminRole } from '../shared/entities/admin-role.entity';

import { AdminRoleController } from './admin-role.controller';
import { AdminRoleService } from './admin-role.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Role, AdminRole])],
  controllers: [AdminRoleController],
  providers: [AdminRoleService],
  exports: [AdminRoleService],
})
export class AdminRoleModule {}
