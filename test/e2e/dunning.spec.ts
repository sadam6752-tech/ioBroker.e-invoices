/**
 * R6.4: the dunning page proposes the next step with the text filled in, the user marks the
 * invoice as reminded, and the invoice shows level and date. Nothing is sent and no XML is
 * created. The level texts can be changed and taken back.
 */
import { expect, test } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

test('proposes a reminder, marks it as sent and shows the level on the invoice', async ({ page, request }) => {
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
				name: 'Mahn Kunde GmbH',
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				customerNumber: 'K-55',
				email: 'mahn@example.com',
			},
			lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: 200, vatRate: 19 }],
			issueDate: '2020-01-01',
			deliveryDate: '2020-01-01',
			dueDate: '2020-01-15',
			currency: 'EUR',
		},
	});
	expect(created.status()).toBe(201);
	const { id } = (await created.json()) as { id: string };
	expect((await request.post(`/api/invoices/${id}/issue`, { headers: auth })).status()).toBe(200);

	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();
	await page.goto('/#/dunning');

	const card = page.locator(`[data-invoice="${id}"]`);
	await expect(card).toContainText('Zahlungserinnerung');
	await expect(card).toContainText('238.00 EUR');
	await card.locator('summary').click();
	await expect(card.locator('pre.dn-text')).toContainText('238,00 €');
	await expect(card.locator('a[href^="mailto:mahn@example.com"]')).toBeVisible();

	// the user marks it as reminded; it is not proposed again on the same day
	await card.locator('[data-mark]').click();
	await expect(page.locator(`[data-invoice="${id}"]`)).toHaveCount(0);
	await page.goto(`/#/invoices/${id}`);
	await expect(page.locator('#d-reminded')).toContainText('Stufe 1');

	// a level text can be changed and taken back
	await page.goto('/#/dunning');
	const level = page.locator('[data-level="1"]');
	await level.locator('.dn-subject').fill('Erinnerung zu {number}');
	await level.locator('[data-save]').click();
	await expect(page.locator('[data-level="1"]')).not.toContainText('(Standardtext)');
	await page.locator('[data-level="1"] [data-reset]').click();
	await expect(page.locator('[data-level="1"]')).toContainText('(Standardtext)');
	expect(errors).toEqual([]);
});
