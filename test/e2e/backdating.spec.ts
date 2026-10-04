/**
 * N4: the number follows the year of the document date. A date in an earlier year continues that year's number
 * circle, so the numbers are not in time order — allowed, but the user is asked before the number is taken.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

/**
 * Creates a draft dated on a day.
 *
 * @param request - Playwright API client bound to the test server
 * @param issueDate - ISO issue date
 */
async function draft(request: APIRequestContext, issueDate: string): Promise<string> {
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
				name: 'Rückdatum AG',
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				customerNumber: 'K-71',
			},
			lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
			issueDate,
			deliveryDate: issueDate,
			currency: 'EUR',
		},
	});
	expect(created.status()).toBe(201);
	return ((await created.json()) as { id: string }).id;
}

test('asks before issuing a document dated in an earlier year, and not for a current date', async ({
	page,
	request,
}) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	const messages: string[] = [];
	let accept = false;
	page.on('dialog', dialog => {
		messages.push(dialog.message());
		void (accept ? dialog.accept() : dialog.dismiss());
	});
	const old = await draft(request, '2019-03-04');
	const current = await draft(request, new Date().toISOString().slice(0, 10));

	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();

	// earlier year: the warning is part of the question, and "no" keeps the draft
	await page.goto(`/#/invoices/${old}`);
	await page.locator('#d-issue').click();
	await expect.poll(() => messages.length).toBe(1);
	expect(messages[0]).toContain('früheren Jahr');
	expect(messages[0]).toContain('2019-03-04');
	expect(
		((await (await request.get(`/api/invoices/${old}`, { headers: auth })).json()) as { status: string }).status,
	).toBe('draft');

	// current date: the plain question, nothing about the number circle
	await page.goto(`/#/invoices/${current}`);
	await page.locator('#d-issue').click();
	await expect.poll(() => messages.length).toBe(2);
	expect(messages[1]).not.toContain('früheren Jahr');

	// "yes" to the warning issues it into the old circle
	accept = true;
	await page.goto(`/#/invoices/${old}`);
	await page.locator('#d-issue').click();
	await expect
		.poll(
			async () =>
				(
					(await (await request.get(`/api/invoices/${old}`, { headers: auth })).json()) as {
						number: string | null;
					}
				).number,
		)
		.toMatch(/^2019-/);
	expect(errors).toEqual([]);
});
