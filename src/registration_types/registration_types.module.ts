import { Module } from '@nestjs/common';
import { RegistrationTypesController } from './admin/registration_types.controller';
import { RegistrationTypesUserController } from './user/registration_types.controller';

import { RegistrationTypesService } from './registration_types.service';
import { RegistrationType } from '../shared/entities/registration_types.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [TypeOrmModule.forFeature([RegistrationType])],
  controllers: [RegistrationTypesController, RegistrationTypesUserController],
  providers: [RegistrationTypesService],
})
export class RegistrationTypesModule {}
