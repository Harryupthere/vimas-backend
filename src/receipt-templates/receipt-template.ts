import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { Order } from '../shared/entities/order.entity';

// Matches EmailService.loadTemplate's convention (src/email/email.service.ts):
// read from `src/...` via process.cwd() rather than __dirname. nest-cli.json
// has no `assets` copy step, so `dist` never contains this .html file — the
// app is run with the `src` tree still present alongside `dist`, exactly as
// EmailService already assumes.
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src',
  'receipt-templates',
  'receipt-template.html',
);
const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Compiled once at module load and reused for every receipt — this is the
// one compiled function used everywhere a receipt's HTML needs to be built;
// nothing assembles receipt HTML by string concatenation.
const compiledReceiptTemplate = Handlebars.compile(templateSource);

export function renderReceiptHtml(data: Record<string, unknown>): string {
  return compiledReceiptTemplate(data);
}

const currencyFormatter = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Same env var / fallback OrdersService.createStripeCheckout uses for the
// actual Stripe charge (process.env.STRIPE_CURRENCY || 'myr') — the receipt
// should always label amounts with whatever currency the buyer was actually
// charged in.
const CURRENCY_CODE = (process.env.STRIPE_CURRENCY || 'myr').toUpperCase();

// Appended after every formatted price/total/amount in the template
// (single_unit_price, line_total, subtotal, total_amount_paid) — nothing
// calls Intl.NumberFormat directly with a `currency` option here, since
// that would render a currency *symbol* in front instead of the code
// trailing behind, which is what's wanted.
function money(amount: number | string): string {
  return `${currencyFormatter.format(Number(amount))} ${CURRENCY_CODE}`;
}

// Builds the placeholder data for receipt-template.html from every order
// row belonging to one invoice. Callers (ReceiptGenerationService) are
// responsible for fetching exactly that set, with relations loaded — every
// row here is assumed to share the same invoice_id, buyer and contact info,
// so header/party fields are read off the first row.
export function buildReceiptTemplateData(
  invoiceId: string,
  orders: Order[],
): Record<string, unknown> {
  const first = orders[0];
  const buyer = first.buyer;
  const contact = first.buyerContactDetails;

  const items = orders.map((order) => ({
    product_name: order.product?.name ?? `Product #${order.productId}`,
    quantity: order.quantity,
    single_unit_price: money(order.singleUnitPrice),
    line_total: money(order.totalAmountPaid),
  }));

  const subtotal = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalPaid = orders.reduce(
    (sum, o) => sum + Number(o.totalAmountPaid),
    0,
  );

  return {
    invoice_id: invoiceId,
    company_address_line: process.env.COMPANY_ADDRESS_LINE || '',
    company_support_email: process.env.COMPANY_SUPPORT_EMAIL || '',
    order_date: first.createdAt
      ? new Date(first.createdAt).toISOString().slice(0, 10)
      : '',
    buyer_name: buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : '',
    buyer_address: contact
      ? [
          contact.address1,
          contact.address2,
          contact.landmark,
          contact.state,
          contact.country,
        ]
          .filter(Boolean)
          .join(', ')
      : '',
    buyer_phone: contact ? `${contact.countryCode} ${contact.phoneNumber}` : '',
    buyer_email: buyer?.email ?? '',
    payment_gateway_id: first.paymentGatewayId ?? '',
    payment_method: first.paymentOption?.name ?? '',
    payment_status: first.paymentStatus?.name ?? '',
    items,
    subtotal: money(subtotal),
    total_amount_paid: money(totalPaid),
  };
}
