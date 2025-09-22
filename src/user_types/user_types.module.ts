import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTypesController } from './admin/user_types.controller';
import { UserTypesUserController } from './user/user_types.controller';
import { UserTypesService } from './user_types.service';
import { UserType } from '../shared/entities/user_types.entity'; // Import the entity

@Module({
  imports: [TypeOrmModule.forFeature([UserType])], // Register entity with TypeORM
  controllers: [UserTypesController, UserTypesUserController],
  providers: [UserTypesService],
})
export class UserTypesModule {}
