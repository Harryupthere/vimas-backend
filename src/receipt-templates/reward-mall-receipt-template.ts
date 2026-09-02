import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { RewardMallPurchase } from '../shared/entities/reward-mall-purchase.entity';
import { ContactInfo } from '../shared/entities/contact-info.entity';

// Same convention as receipt-template.ts / EmailService.loadTemplate: read
// from `src/...` via process.cwd() rather than __dirname, since this repo
// runs with `src` present alongside `dist` (no nest-cli.json assets step).
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src',
  'receipt-templates',
  'reward-mall-receipt-template.html',
);
const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Compiled once at module load and reused for every reward mall receipt —
// the one compiled function used everywhere this receipt's HTML needs to be
// built; nothing assembles it by string concatenation.
const compiledTemplate = Handlebars.compile(templateSource);

export function renderRewardMallReceiptHtml(
  data: Record<string, unknown>,
): string {
  return compiledTemplate(data);
}

const pointsFormatter = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Reward mall redemptions are paid in points, never currency — every
// points value in the template is suffixed "VP" (Vimas Points) instead of
// going through the currency formatting used for order receipts.
function points(amount: number | string): string {
  return `${pointsFormatter.format(Number(amount))} VP`;
}

// Builds the placeholder data for reward-mall-receipt-template.html from
// one redemption. Unlike orders (many rows share one invoice_id), a reward
// mall purchase is always a single product — one row, one invoice.
// `contact` may be null: a buyer isn't required to have any contact_info
// on file before redeeming, so the template falls back to
// "No delivery address found." (has_delivery_address: false) instead.
export function buildRewardMallReceiptTemplateData(
  invoiceId: string,
  purchase: RewardMallPurchase,
  contact: ContactInfo | null,
): Record<string, unknown> {
  const buyer = purchase.user;
  const product = purchase.product;

  return {
    invoice_id: invoiceId,
    company_address_line: process.env.COMPANY_ADDRESS_LINE || '',
    company_support_email: process.env.COMPANY_SUPPORT_EMAIL || '',
    redeemed_date: purchase.createdAt
      ? new Date(purchase.createdAt).toISOString().slice(0, 10)
      : '',
    buyer_name: buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : '',
    has_delivery_address: !!contact,
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
    product_name: product?.name ?? `Reward #${purchase.rewardMallProductId}`,
    product_sub_title: product?.subTitle ?? '',
    quantity: purchase.quantity,
    points_per_unit: points(
      purchase.quantity > 0
        ? Number(purchase.pointsRedeemed) / purchase.quantity
        : purchase.pointsRedeemed,
    ),
    points_redeemed: points(purchase.pointsRedeemed),
    status_name: purchase.status?.name ?? '',
    tracking_number: purchase.trackingNumber ?? '',
  };
}
