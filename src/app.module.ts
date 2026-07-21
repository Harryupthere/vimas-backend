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
import { AdminModule } from './admin/admin.module';
import { StripeModule } from './stripe/stripe.module';
import { ContactInfoModule } from './contact-info/contact-info.module';
import { OrderStatusModule } from './order-status/order-status.module';
import { PaymentStatusModule } from './payment-status/payment-status.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewRatingModule } from './review-rating/review-rating.module';
import { ProductHistoryModule } from './product-history/product-history.module';
import { PointDistributionModule } from './point-distribution/point-distribution.module';
import { PointUserBalanceModule } from './point-user-balance/point-user-balance.module';
import { PointAdminBalanceModule } from './point-admin-balance/point-admin-balance.module';
import { PointPoolDetailModule } from './point-pool-detail/point-pool-detail.module';
import { PointPoolModule } from './point-pool/point-pool.module';
import { PointTransactionModule } from './point-transaction/point-transaction.module';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env variables available everywhere
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<number>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],

        synchronize: false,
        migrationsRun: true,
      }),
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
    AdminModule,
    StripeModule,
    ContactInfoModule,
    OrderStatusModule,
    PaymentStatusModule,
    OrdersModule,
    ReviewRatingModule,
    ProductHistoryModule,
    PointDistributionModule,
    PointUserBalanceModule,
    PointAdminBalanceModule,
    PointPoolDetailModule,
    PointPoolModule,
    PointTransactionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
