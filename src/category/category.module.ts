import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryUserController } from './user/category.controller';
import { CategoryController } from './admin/category.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../shared/entities/categories.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [CategoryService, JwtStrategy],
  controllers: [CategoryUserController, CategoryController],
})
export class CategoryModule {}
