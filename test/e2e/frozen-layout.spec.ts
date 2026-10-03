/**
 * R7.8: an issued invoice shows the layout it was frozen with and offers a second
 * re-render that uses it; the history says which layout each re-render used.
 */
import { expect, test } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

test('re-renders with the issued layout and records which layout was used', async ({ page, request }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
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
				name: 'Frost AG',
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				customerNumber: 'K-88',
			},
			lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: 50, vatRate: 19 }],
			issueDate: '2026-01-10',
			deliveryDate: '2026-01-10',
			currency: 'EUR',
		},
	});
	const { id } = (await created.json()) as { id: string };
	expect((await request.post(`/api/invoices/${id}/issue`, { headers: auth })).status()).toBe(200);

	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();
	await page.goto(`/#/invoices/${id}`);

	await expect(page.locator('#d-frozen')).toContainText('eingefroren am');
	page.on('dialog', dialog => void dialog.accept(dialog.type() === 'prompt' ? 'Test' : undefined));
	await page.getByRole('button', { name: 'Mit ausgestelltem Layout neu rendern' }).click();
	await expect(page.locator('#d-out')).toContainText('PDF neu erzeugt');
	await expect(page.locator('#d-history')).toContainText('Neu gerendert (1)');
	await page.locator('#d-history summary').click();
	await expect(page.locator('#d-history')).toContainText('Layout wie ausgestellt');

	await page.getByRole('button', { name: 'Neu rendern', exact: true }).click();
	await expect(page.locator('#d-history')).toContainText('Neu gerendert (2)');
	await page.locator('#d-history summary').click();
	await expect(page.locator('#d-history')).toContainText('aktuelles Layout');
	expect(errors).toEqual([]);
});
