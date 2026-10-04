/**
 * 0.9.3: the invoice list and its exports take a date range. The page narrows the list, the quick
 * choices fill the two days, and the CSV download carries exactly the range in its file name and
 * only the invoices of those days (both boundary days included, no drafts).
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

/**
 * Issues an invoice on a day for a customer of its own.
 *
 * @param request - Playwright API client bound to the test server
 * @param issueDate - ISO issue date
 * @param customer - buyer name
 */
async function issue(request: APIRequestContext, issueDate: string, customer: string): Promise<void> {
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller: {
				name: 'Muster GmbH',
				street: 'Beispielstr. 1',
				zip: '10115',
				city: 'Berlin',
				country: 'DE',
				vatId: 'DE123456789',
			},
			buyer: {
				name: customer,
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				customerNumber: 'K-61',
			},
			lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
			issueDate,
			deliveryDate: issueDate,
			currency: 'EUR',
		},
	});
	expect(created.status()).toBe(201);
	const { id } = (await created.json()) as { id: string };
	expect((await request.post(`/api/invoices/${id}/issue`, { headers: auth })).status()).toBe(200);
}

test('narrows the list to a range and exports exactly that range', async ({ page, request }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await issue(request, '2031-07-31', 'Zeitraum Vorher AG');
	await issue(request, '2031-08-01', 'Zeitraum Erster AG');
	await issue(request, '2031-08-31', 'Zeitraum Letzter AG');
	await issue(request, '2031-09-01', 'Zeitraum Nachher AG');

	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();
	await page.goto('/#/');

	await page.locator('#f-from').fill('2031-08-01');
	await page.locator('#f-from').dispatchEvent('change');
	await page.locator('#f-to').fill('2031-08-31');
	await page.locator('#f-to').dispatchEvent('change');
	await expect(page.locator('#f-range')).toHaveValue('custom');
	await expect(page.locator('#list')).toContainText('Zeitraum Erster AG');
	await expect(page.locator('#list')).toContainText('Zeitraum Letzter AG');
	await expect(page.locator('#list')).not.toContainText('Zeitraum Vorher AG');
	await expect(page.locator('#list')).not.toContainText('Zeitraum Nachher AG');

	const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#f-csv').click()]);
	expect(download.suggestedFilename()).toBe('rechnungen_2031-08-01_2031-08-31.csv');
	const csv = readFileSync(await download.path(), 'utf8');
	expect(csv).toContain('Zeitraum Erster AG');
	expect(csv).toContain('Zeitraum Letzter AG');
	expect(csv).not.toContain('Zeitraum Vorher AG');
	expect(csv).not.toContain('Zeitraum Nachher AG');

	// a quick choice fills both days with the range of this year, and "all" empties them again
	await page.locator('#f-range').selectOption('thisYear');
	const year = new Date().getFullYear();
	await expect(page.locator('#f-from')).toHaveValue(`${year}-01-01`);
	await expect(page.locator('#f-to')).toHaveValue(`${year}-12-31`);
	await page.locator('#f-range').selectOption('');
	await expect(page.locator('#f-from')).toHaveValue('');
	await expect(page.locator('#f-to')).toHaveValue('');
	expect(errors).toEqual([]);
});
