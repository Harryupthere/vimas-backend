import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../shared/auth/strategies/jwt.strategy';
import { Order } from '../shared/entities/order.entity';
import { OrderSnapshot } from '../shared/entities/order-snapshot.entity';
import { Cart } from '../shared/entities/cart.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { PaymentOption } from '../shared/entities/payment-option.entity';
import { CryptoCurrency } from '../shared/entities/crypto-currency.entity';
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { User } from '../shared/entities/user.entity';
import { StripeModule } from '../stripe/stripe.module';
import { CoinPaymentsModule } from '../coinpayments/coinpayments.module';
import { OrdersService } from './orders.service';
import { CheckoutPricingService } from './checkout-pricing.service';
import { OrdersController } from './user/orders.controller';
import { OrdersAdminController } from './admin/orders.controller';
import { OrdersWebhookController } from './webhook/orders-webhook.controller';
import { PointDistributionPurchaseQueue } from 'src/shared/entities/point-distribution-purchase-queue.entity';
import { BullModule } from '@nestjs/bull';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductExtraChargesModule } from '../product-extra-charges/product-extra-charges.module';
import { ProductAddOnsModule } from '../product-add-ons/product-add-ons.module';
import { ProductCouponsModule } from '../product-coupons/product-coupons.module';
import { ProductDiscountsModule } from '../product-discounts/product-discounts.module';
import { VimasEWalletModule } from '../vimas-e-wallet/vimas-e-wallet.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderSnapshot,
      Cart,
      ContactInfo,
      PaymentOption,
      CryptoCurrency,
      PointDistributionPurchaseQueue,
      ProductBulkDetail,
      User,
    ]),

    BullModule.registerQueue({
      name: 'point-distribution',
    }),

    StripeModule,
    CoinPaymentsModule,
    NotificationsModule,
    ProductExtraChargesModule,
    ProductAddOnsModule,
    ProductCouponsModule,
    ProductDiscountsModule,
    VimasEWalletModule,
    // Only used for ReceiptsService.getStatusesForInvoiceIds, to attach the
    // `receipt` field on findMyOrders (Step 6) — OrdersService never
    // enqueues receipt generation itself, that's user-triggered via the
    // receipts module's own controller.
    ReceiptsModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [OrdersService, CheckoutPricingService, JwtStrategy],
  controllers: [
    OrdersController,
    OrdersAdminController,
    OrdersWebhookController,
  ],
})
export class OrdersModule {}
