import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { ContactInfoService } from './contact-info.service';
import { ContactInfoController } from './user/contact-info.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactInfo]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ContactInfoService, JwtStrategy],
  controllers: [ContactInfoController],
})
export class ContactInfoModule {}
