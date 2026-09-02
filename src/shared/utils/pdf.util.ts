import puppeteer from 'puppeteer';

// Shared by every receipt generator (order receipts, reward mall receipts)
// so the browser-launch/page-print logic lives in exactly one place.
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Waits for the page (no external network requests in these templates —
    // everything is inline CSS) to be fully laid out before printing, so
    // each template's own @page/page-break-inside CSS has already applied.
    // setContent's waitUntil type doesn't accept the networkidle* values
    // (those are goto()-only) — 'load' is enough since nothing is fetched
    // over the network.
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      // No fixed height here — each template's own CSS handles pagination
      // for however many line items/rows there are.
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
