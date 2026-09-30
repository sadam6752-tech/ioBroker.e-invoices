/**
 * The three sample cases the layout editor promises (Vollrechnung, Kleinbetrag,
 * Gutschrift, see the preview data set of the templates).
 *
 * They run through the real API because the interesting part is what leaves the house:
 * the CII XML and the hybrid PDF. Only the small amount also gets a look in the browser —
 * a cent amount is where rounding and the list formatting disagree first.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { readPdfStructure } from './pdf-structure';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/** Header every API call of this suite needs while a token is configured. */
const auth = { authorization: `Bearer ${token}` };

const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
};

const buyer = {
	name: 'Musterkunde KG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-11',
};

/** What the API reports for an issued invoice. */
interface IssuedInvoice {
	id: string;
	number: string;
	totals: { netTotal: number; taxTotal: number; grossTotal: number };
}

/**
 * Creates a draft from the given body and issues it.
 *
 * @param request - Playwright API client bound to the test server
 * @param data - draft fields on top of the fixed parties
 */
async function issue(request: APIRequestContext, data: Record<string, unknown>): Promise<IssuedInvoice> {
	const created = await request.post('/api/invoices', { headers: auth, data: { seller, buyer, ...data } });
	expect(created.status()).toBe(201);
	const draft = (await created.json()) as { id: string };
	const issued = await request.post(`/api/invoices/${draft.id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	return (await issued.json()) as IssuedInvoice;
}

/**
 * Downloads the CII XML of an invoice.
 *
 * @param request - Playwright API client bound to the test server
 * @param id - invoice id
 */
async function xmlOf(request: APIRequestContext, id: string): Promise<string> {
	const response = await request.get(`/api/invoices/${id}.xml`, { headers: auth });
	expect(response.status()).toBe(200);
	return response.text();
}

/**
 * Signs in through the login page.
 *
 * @param page - page under test
 */
async function signIn(page: Page): Promise<void> {
	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();
}

test('issues a full invoice with two VAT rates and a line discount', async ({ request }) => {
	const invoice = await issue(request, {
		lines: [
			{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
			{ description: 'Fachbuch', quantity: 1, unit: 'Stk', unitPriceNet: 50, discountPercent: 10, vatRate: 7 },
		],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		documentTitle: 'Rechnung',
	});

	// 2 × 100 + (50 − 10 %) = 245 net, tax 38.00 + 3.15 = 41.15, gross 286.15
	expect(invoice.totals.netTotal).toBe(245);
	expect(invoice.totals.taxTotal).toBe(41.15);
	expect(invoice.totals.grossTotal).toBe(286.15);

	const xml = await xmlOf(request, invoice.id);
	expect(xml).toContain('<ram:TypeCode>380</ram:TypeCode>');
	// both rates need their own tax breakdown entry
	expect(xml).toContain('<ram:RateApplicablePercent>19</ram:RateApplicablePercent>');
	expect(xml).toContain('<ram:RateApplicablePercent>7</ram:RateApplicablePercent>');
	expect(xml).toContain('<ram:TaxBasisTotalAmount>245.00</ram:TaxBasisTotalAmount>');
	expect(xml).toContain('<ram:GrandTotalAmount>286.15</ram:GrandTotalAmount>');
});

test('issues a small amount invoice whose cent rounding stays exact', async ({ page, request }) => {
	// 0.10 net at 19 % is 1.9 cents — the rounding has to land on 12 cents gross
	const invoice = await issue(request, {
		lines: [{ description: 'Kleinbetrag Posten', quantity: 1, unit: 'Stk', unitPriceNet: 0.1, vatRate: 19 }],
		issueDate: '2026-09-28',
	});

	expect(invoice.totals.netTotal).toBe(0.1);
	expect(invoice.totals.taxTotal).toBe(0.02);
	expect(invoice.totals.grossTotal).toBe(0.12);

	const xml = await xmlOf(request, invoice.id);
	expect(xml).toContain('<ram:LineTotalAmount>0.10</ram:LineTotalAmount>');
	expect(xml).toContain('<ram:TaxBasisTotalAmount>0.10</ram:TaxBasisTotalAmount>');
	expect(xml).toContain('<ram:GrandTotalAmount>0.12</ram:GrandTotalAmount>');

	// and the list shows the same amount, not a rounded 0.1 "EUR"
	await signIn(page);
	await page.goto('/#/');
	const row = page.locator('#list .card').filter({ hasText: invoice.number });
	await expect(row).toContainText('0.12 EUR');
});

test('issues a credit note with the CII type code 381', async ({ request }) => {
	const invoice = await issue(request, {
		documentTitle: 'Gutschrift',
		notes: 'Gutschrift zur Rechnung 2026-01-001 wegen Minderlieferung.',
		lines: [{ description: 'Gutschrift Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
	});

	// BT-3: the title picked in the wizard decides the UNTDID 1001 code
	const xml = await xmlOf(request, invoice.id);
	expect(xml).toContain('<ram:TypeCode>381</ram:TypeCode>');
	expect(xml).not.toContain('<ram:TypeCode>380</ram:TypeCode>');
	// § 14 Abs. 4 UStG wants the word on the document: it travels as a note and as the
	// title of the sight component (the PDF text itself cannot be read back here — the
	// embedded subset font stores glyph ids, not characters)
	expect(xml).toContain('<ram:Content>Gutschrift zur Rechnung');
	const detail = await request.get(`/api/invoices/${invoice.id}`, { headers: auth });
	expect(detail.status()).toBe(200);
	expect(((await detail.json()) as { documentTitle: string }).documentTitle).toBe('Gutschrift');

	// the credit note is still a PDF/A-3b hybrid, not a special case of its own
	const pdf = await request.get(`/api/invoices/${invoice.id}.pdf`, { headers: auth });
	expect(pdf.status()).toBe(200);
	const structure = await readPdfStructure(await pdf.body());
	expect(structure.outputIntentSubtype).toBe('GTS_PDFA1');
	expect(structure.hasAssociatedFiles).toBe(true);
	expect(structure.fonts.every(font => font.embedded && font.toUnicode)).toBe(true);
});
