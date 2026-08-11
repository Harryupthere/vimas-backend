import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { Order } from '../shared/entities/order.entity';
import { Cart } from '../shared/entities/cart.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { CryptoCurrency } from '../shared/entities/crypto-currency.entity';
import { StripeModule } from '../stripe/stripe.module';
import { CoinPaymentsModule } from '../coinpayments/coinpayments.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './user/orders.controller';
import { OrdersAdminController } from './admin/orders.controller';
import { OrdersWebhookController } from './webhook/orders-webhook.controller';
import { PointDistributionPurchaseQueue } from 'src/shared/entities/point-distribution-purchase-queue.entity';
import { BullModule } from '@nestjs/bull';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Cart,
      ContactInfo,
      PaymentOption,
      CryptoCurrency,
      PointDistributionPurchaseQueue,
    ]),

    BullModule.registerQueue({
      name: 'point-distribution',
    }),

    StripeModule,
    CoinPaymentsModule,
    NotificationsModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [OrdersService, JwtStrategy],
  controllers: [
    OrdersController,
    OrdersAdminController,
    OrdersWebhookController,
  ],
})
export class OrdersModule {}
