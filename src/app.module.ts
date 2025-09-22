import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTypesModule } from './user_types/user_types.module';
import { RegistrationTypesModule } from './registration_types/registration_types.module';
import { ConfigModule } from '@nestjs/config';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { ProductsModule } from './products/product.module';
import { PaymentOptionModule } from './payment-option/payment-option.module';
import { ProductMediaModule } from './product-media/product-media.module';
import { ProductActionsModule } from './product-action/product-action.module';
import { ProductPaymentOptionModule } from './product-payment-option/product-payment-option.module';
import { CartModule } from './cart/cart.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env variables available everywhere
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      //  password: null,
      database: 'vimas',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false, // ⚠️ must be false in production if using migrations
      migrationsRun: true, // automatically run migrations on app start
    }),
    UsersModule,
    UserTypesModule,
    RegistrationTypesModule,
    CategoryModule,
    BrandModule,
    ProductsModule,
    ProductMediaModule,
    ProductActionsModule,
    PaymentOptionModule,
    ProductPaymentOptionModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
