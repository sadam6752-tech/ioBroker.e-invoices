/**
 * R6.3: documents are bound to a company; the invoice list can be narrowed to one
 * company and the revenue page adds the invoices up per company. The sums on the page
 * are compared with the answer of the API — the page adds nothing up on its own.
 *
 * All specs share one throw-away server, so the companies of this spec carry their own
 * names and nothing assumes an empty database.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

/**
 * What the page shows for an amount (`eur()` of the web app).
 *
 * @param value - Amount in EUR.
 */
const eur = (value: number): string => `${value.toFixed(2)} EUR`;

/**
 * Creates a company profile.
 *
 * @param request - Playwright API client bound to the test server
 * @param name - company name
 */
async function company(request: APIRequestContext, name: string): Promise<string> {
	const created = await request.post('/api/company-profiles', {
		headers: auth,
		data: {
			name,
			profile: {
				name,
				street: 'Beispielstr. 1',
				zip: '10115',
				city: 'Berlin',
				country: 'DE',
				vatId: 'DE123456789',
			},
		},
	});
	expect(created.status()).toBe(201);
	return ((await created.json()) as { id: string }).id;
}

/**
 * Issues an invoice for a company.
 *
 * @param request - Playwright API client bound to the test server
 * @param companyId - company profile id
 * @param name - company name (the seller)
 * @param net - net price of the single line (19 % VAT)
 */
async function issue(request: APIRequestContext, companyId: string, name: string, net: number): Promise<void> {
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			companyId,
			seller: {
				name,
				street: 'Beispielstr. 1',
				zip: '10115',
				city: 'Berlin',
				country: 'DE',
				vatId: 'DE123456789',
			},
			buyer: {
				name: `Kunde von ${name}`,
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				customerNumber: 'K-91',
			},
			lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: net, vatRate: 19 }],
			issueDate: '2026-01-10',
			dueDate: '2026-01-31',
			deliveryDate: '2026-01-10',
			currency: 'EUR',
		},
	});
	expect(created.status()).toBe(201);
	const { id } = (await created.json()) as { id: string };
	expect((await request.post(`/api/invoices/${id}/issue`, { headers: auth })).status()).toBe(200);
}

test('shows the revenue per company with the sums of the API and filters the list by company', async ({
	page,
	request,
}) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	const first = await company(request, 'Umsatz Alpha GmbH');
	const second = await company(request, 'Umsatz Beta KG');
	await issue(request, first, 'Umsatz Alpha GmbH', 100);
	await issue(request, first, 'Umsatz Alpha GmbH', 50);
	await issue(request, second, 'Umsatz Beta KG', 400);

	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();

	await page.goto('/#/revenue');
	await page.locator('#rv-year').fill('2026');
	await page.locator('#rv-year').dispatchEvent('change');
	const report = (await (
		await request.get('/api/reports/revenue-by-company?year=2026', { headers: auth })
	).json()) as {
		rows: { companyId: string | null; gross: number }[];
		total: { gross: number };
	};
	const alpha = report.rows.find(row => row.companyId === first)!;
	const beta = report.rows.find(row => row.companyId === second)!;
	expect(alpha.gross).toBeCloseTo(178.5, 2);
	await expect(page.locator(`tr[data-company="${first}"]`)).toContainText('Umsatz Alpha GmbH');
	await expect(page.locator(`tr[data-company="${first}"]`)).toContainText(eur(alpha.gross));
	await expect(page.locator(`tr[data-company="${second}"]`)).toContainText(eur(beta.gross));
	await expect(page.locator('#rv-total')).toContainText(eur(report.total.gross));

	// the invoice list can be narrowed to one company
	await page.goto('/#/');
	const filter = page.locator('#f-company');
	await expect(filter).toBeVisible();
	await filter.selectOption(second);
	await expect(page.locator('#list')).toContainText('Kunde von Umsatz Beta KG');
	await expect(page.locator('#list')).not.toContainText('Kunde von Umsatz Alpha GmbH');
	expect(errors).toEqual([]);
});
