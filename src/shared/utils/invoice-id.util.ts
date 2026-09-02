import { customAlphabet } from 'nanoid';

// Lowercase letters + digits only, 10 chars — matches the "VIMAS#12osdjk"
// style format. 36^10 (~3.7e15) combinations is far beyond what a birthday-
// collision at this order volume needs to worry about; callers still treat
// it as generate-and-check rather than assume uniqueness (see
// OrdersService.generateUniqueInvoiceId), since orders.invoice_id carries no
// DB-level unique constraint to catch a collision for us.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const generateShortId = customAlphabet(ALPHABET, 10);

export function generateInvoiceId(): string {
  return `VIMAS#${generateShortId()}`;
}
