import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('crypto_currencies')
export class CryptoCurrency {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  // CoinPayments' own currency code for this coin, e.g. "BTC", "ETH",
  // "USDT.TRC20" — this is what gets sent as the invoice's `currency`
  // once we support per-coin invoices.
  @Column({
    name: 'coinpayment_id',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  coinpaymentId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  symbol: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl: string;

  @Column({ name: 'decimal_places', type: 'int', default: 8 })
  decimalPlaces: number;

  @Column({ name: 'website_url', type: 'varchar', length: 255, nullable: true })
  websiteUrl: string;

  @Column({
    name: 'explorer_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  explorerUrl: string;

  // Fiat currency this coin's rate is quoted against when we call
  // CoinPayments' rate-conversion endpoint (v2/rates?from=..&to=coinpaymentId).
  // Should match the store's own charge currency (see COINPAYMENTS_BASE_CURRENCY)
  // unless you intend to do your own extra conversion hop.
  @Column({
    name: 'price_currency_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  priceCurrencyId: string;

  // 0=inactive, 1=active
  @Column({ type: 'tinyint', width: 1, default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
