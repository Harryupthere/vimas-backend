import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipTypesController } from './admin/membership-types.controller';
import { MembershipTypesService } from './membership-types.service';
import { MembershipType } from '../shared/entities/membership-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MembershipType])],
  controllers: [MembershipTypesController],
  providers: [MembershipTypesService],
})
export class MembershipTypesModule {}
