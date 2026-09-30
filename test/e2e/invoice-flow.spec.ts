/**
 * The chain a user walks through: a draft is created and issued through the API, then the
 * browser finds it in the list, opens the detail page, validates it and downloads the
 * hybrid PDF and the XML — the two artifacts that leave the house (R5).
 */
import { expect, test, type Page } from '@playwright/test';

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
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
};

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

test('walks from the issued invoice to the PDF download', async ({ page, request }) => {
	// 1. the data of this test comes from the real API, so the browser sees a document
	//    that went through validation and numbering
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller,
			buyer,
			lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
			currency: 'EUR',
			documentTitle: 'Rechnung',
		},
	});
	expect(created.status()).toBe(201);
	const id = ((await created.json()) as { id: string }).id;

	await request.post(`/api/invoices/${id}/validate`, { headers: auth }).then(r => expect(r.status()).toBe(200));
	const issued = await request.post(`/api/invoices/${id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	const number = ((await issued.json()) as { number: string }).number;
	expect(number).toMatch(/^\d{4}-\d{2}-\d{3}$/);

	// 2. the list shows the issued invoice
	await signIn(page);
	await page.goto('/#/');
	const row = page.locator('#list .card').filter({ hasText: number });
	await expect(row).toContainText('Kunde AG');
	// 2 × 100 net + 19 % VAT, formatted the way the list formats amounts
	await expect(row).toContainText('238.00 EUR');

	// 3. the detail page belongs to it and does not offer an edit for a booked invoice
	await row.getByRole('link', { name: 'Ansehen' }).click();
	await expect(page.locator('#view strong').first()).toHaveText(number);
	await expect(page.getByRole('link', { name: 'Bearbeiten' })).toHaveCount(0);

	// 4. validating the issued document is clean and the report is stored (R2)
	await page.getByRole('button', { name: 'Validieren' }).click();
	await expect(page.locator('#d-out')).toContainText('Gültig: keine Fehler.');

	// 5. the download button of the detail page hands the PDF to the browser
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'PDF ↓' }).click(),
	]);
	expect(download.suggestedFilename()).toBe(`${number}.pdf`);

	// 6. and the artifacts themselves are a PDF and a CII XML
	const pdf = await request.get(`/api/invoices/${id}.pdf`, { headers: auth });
	expect(pdf.status()).toBe(200);
	expect(pdf.headers()['content-type']).toContain('application/pdf');
	const bytes = await pdf.body();
	expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
	expect(bytes.length).toBeGreaterThan(20_000);

	const xml = await request.get(`/api/invoices/${id}.xml`, { headers: auth });
	expect(xml.status()).toBe(200);
	const text = await xml.text();
	expect(text).toContain('CrossIndustryInvoice');
	expect(text).toContain('DE123456789');
});
