import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './admin/brand.controller';
import { BrandUserController } from './user/brand.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../shared/entities/brand.entity';
import { Category } from '../shared/entities/categories.entity';
import { CategoryBrand } from '../shared/entities/category-brand.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, Category, CategoryBrand]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [BrandService],
  controllers: [BrandController, BrandUserController],
})
export class BrandModule {}
