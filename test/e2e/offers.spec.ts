/**
 * The chain a user walks through for an offer (R8) — through the browser only:
 * create the offer in the wizard, issue it, record the customer's "yes" and turn it
 * into an invoice draft. The last step checks what the two lists show afterwards: the
 * booking list must not carry the A-number, and neither must the accounting export.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

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

/**
 * Fills one address block of the wizard.
 *
 * @param page - page under test
 * @param side - `seller` or `buyer`
 * @param party - Values to type
 */
async function fillParty(page: Page, side: 'seller' | 'buyer', party: Record<string, string>): Promise<void> {
	for (const [field, value] of Object.entries(party)) {
		await page.locator(`input[data-p="${side}"][data-f="${field}"]`).fill(value);
	}
}

test('walks an offer from the wizard to the invoice draft', async ({ page }) => {
	// the wizard and the detail page ask before they act (GoBD)
	page.on('dialog', dialog => void dialog.accept());
	await signIn(page);

	// 1. the entry point of an offer is the tab — the type is preselected there
	await page.goto('/#/offers');
	await page.getByRole('link', { name: '+ Neues Angebot' }).click();
	await expect(page.locator('#w-doctype')).toHaveValue('quote');

	// 2. Verkäufer (a quotation needs no BT-10, so the customer number stays empty)
	await fillParty(page, 'seller', {
		name: 'Muster GmbH',
		street: 'Beispielstr. 1',
		zip: '10115',
		city: 'Berlin',
		vatId: 'DE123456789',
	});
	await page.getByRole('button', { name: 'Weiter' }).click();

	// 3. Käufer
	await fillParty(page, 'buyer', {
		name: 'Kunde AG',
		street: 'Kundenweg 5',
		zip: '80331',
		city: 'München',
	});
	await page.getByRole('button', { name: 'Weiter' }).click();

	// 4. Positionen: the offer is asked for its validity, not for a due date
	await expect(page.locator('#w-valid')).toBeVisible();
	await expect(page.locator('#w-due')).toHaveCount(0);
	await page.locator('input[data-l="0.description"]').fill('Beratung');
	await page.locator('input[data-l="0.unitPriceNet"]').fill('100');
	await page.getByRole('button', { name: 'Weiter' }).click();

	// 5. review: 100 + 19 % VAT and the offer wording
	await expect(page.locator('#view')).toContainText('119.00 EUR');
	await expect(page.locator('#view')).toContainText('ein Angebot ist keine E-Rechnung');
	await page.getByRole('button', { name: 'Entwurf speichern' }).click();

	// 6. issuing gives the offer its own number circle and a plain sight PDF
	const number = await (async (): Promise<string> => {
		await expect(page.getByRole('button', { name: 'Ausstellen' })).toBeVisible();
		await page.getByRole('button', { name: 'Ausstellen' }).click();
		const heading = page.locator('#view strong').first();
		await expect(heading).toHaveText(/^A-\d{4}-\d{2}-\d{3}$/);
		return (await heading.textContent()) ?? '';
	})();
	expect(number).toMatch(/^A-\d{4}-\d{2}-\d{3}$/);
	// an offer is never paid: the booking checkbox stays away
	await expect(page.locator('#d-paid')).toHaveCount(0);
	await expect(page.locator('#view')).toContainText('Gültig bis:');

	// 7. the customer says yes, and the decision is on the page afterwards
	await page.getByRole('button', { name: 'Annehmen' }).click();
	await expect(page.locator('#view .badge.accepted')).toHaveText('Angenommen');
	await expect(page.getByRole('button', { name: 'Ablehnen' })).toHaveCount(0);

	// 8. the accepted offer becomes an invoice *draft*
	await page.getByRole('button', { name: 'In Rechnung umwandeln' }).click();
	const draftLink = page.getByRole('link', { name: 'Entwurf öffnen' });
	await expect(draftLink).toBeVisible();
	const draftId = ((await draftLink.getAttribute('href')) ?? '').replace('#/edit/', '');
	expect(draftId).not.toBe('');

	// 9. both sides of the chain know each other
	await expect(page.locator('#view')).toContainText('Daraus hervorgegangene Rechnung(en)');
	await page.goto(`/#/invoices/${draftId}`);
	await expect(page.locator('#view')).toContainText('Zugrunde liegendes Angebot');
	await expect(page.locator('#view')).toContainText(number);

	// 10. the booking list stays a booking list: no A-number in it
	await page.goto('/#/');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('#list')).not.toContainText(number);

	// 11. and the accounting export of the list does not carry the offer either
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'CSV' }).click(),
	]);
	const path = await download.path();
	expect(path, 'the CSV export was not written').toBeTruthy();
	expect(readFileSync(path, 'utf8')).not.toContain(number);

	// 12. the offer tab shows it with its state
	await page.goto('/#/offers');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('#o-list')).toContainText(number);
	await expect(page.locator('#o-list')).toContainText('Angenommen');
});
