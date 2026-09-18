import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../shared/entities/admin.entity';
import { RoleService } from './role.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { Role } from '../shared/entities/role.entity';
import { AdminRole } from '../shared/entities/admin-role.entity';
import { RoleController } from './role.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Role, AdminRole]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RoleService],
  controllers: [RoleController],
  exports: [RoleService],
})
export class RoleModule {}
