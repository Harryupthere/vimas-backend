import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

// Thin wrapper around CoinPayments' Invoices v2 API — mirrors the HMAC
// request-signing scheme CoinPayments requires (client id + timestamp +
// method + full URL + JSON body, HMAC-SHA256, base64), same approach
// already proven out in the sibling Tradelive24 backend's integration.
@Injectable()
export class CoinPaymentsService {
  private readonly logger = new Logger(CoinPaymentsService.name);

  private readonly baseUrl =
    process.env.COINPAYMENTS_API_URL ?? 'https://a-api.coinpayments.net/api/';
  private readonly invoicesUrl = `${this.baseUrl}v2/merchant/invoices`;
  // Public getter below — callers building an invoice payload need to
  // include this alongside the signed headers.
  private readonly _clientId = process.env.COINPAYMENTS_PUBLIC_KEY ?? '';
  private readonly clientSecret = process.env.COINPAYMENTS_PRIVATE_KEY ?? '';

  get invoicesEndpoint(): string {
    return this.invoicesUrl;
  }

  get clientId(): string {
    return this._clientId;
  }

  get ratesEndpoint(): string {
    return `${this.baseUrl}v2/rates`;
  }

  private signRequest(
    method: string,
    url: string,
    body: Record<string, any> | null,
  ): Record<string, string> {
    const timestamp = new Date().toISOString().split('.')[0];
    const payload = body ? JSON.stringify(body) : '';
    // CoinPayments requires the signed message to be prefixed with a UTF-8
    // BOM — dropping it makes every signature invalid.
    const BOM = '﻿';
    const message = BOM + method + url + this.clientId + timestamp + payload;
    const signature = createHmac('sha256', this.clientSecret)
      .update(message)
      .digest('base64');

    return {
      'X-CoinPayments-Client': this.clientId,
      'X-CoinPayments-Timestamp': timestamp,
      'X-CoinPayments-Signature': signature,
      'Content-Type': 'application/json',
    };
  }

  async createInvoice(payload: Record<string, any>): Promise<any> {
    const headers = this.signRequest('POST', this.invoicesUrl, payload);
    const response = await fetch(this.invoicesUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      this.logger.error(
        `CoinPayments invoice creation failed (${response.status}): ${JSON.stringify(data)}`,
      );
      throw new Error(
        data?.error?.message || 'Failed to create CoinPayments invoice',
      );
    }
    return data;
  }

  async getInvoice(invoiceId: string): Promise<any> {
    const url = `${this.invoicesUrl}/${invoiceId}`;
    const headers = this.signRequest('GET', url, null);
    const response = await fetch(url, { method: 'GET', headers });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          `Failed to fetch CoinPayments invoice ${invoiceId}`,
      );
    }
    return data;
  }

  // Best-effort — a rate-lookup failure falls back to 1 (no conversion)
  // rather than blocking checkout, same resilience convention used
  // elsewhere in this codebase for non-critical third-party calls.
  async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    try {
      const url = `${this.ratesEndpoint}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);
      const rate = data?.items?.[0]?.rate;
      return rate ? Number(rate) : 1;
    } catch (err) {
      this.logger.warn(
        `CoinPayments rate lookup failed (${from}->${to}), defaulting rate=1: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return 1;
    }
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): boolean {
    if (!this.clientSecret || !rawBody || !signature) return false;

    const expectedSignature = createHmac('sha256', this.clientSecret)
      .update(rawBody)
      .digest('base64');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  }
}
