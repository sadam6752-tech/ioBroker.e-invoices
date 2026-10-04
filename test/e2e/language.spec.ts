/**
 * R7.2: the web app starts in the language of the browser (admin setting `auto`),
 * the address bar can force one, and English really covers the screens a user meets.
 *
 * The rest of the suite runs with a German browser (`playwright.config.ts`), so the
 * German text those specs click on keeps proving the German side.
 */
import { expect, test, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/**
 * Signs in through the login page.
 *
 * @param page - page under test
 * @param save - label of the save button in the language in use
 */
async function signIn(page: Page, save: string): Promise<void> {
	await page.getByLabel(/api.token/i).fill(token);
	await page.getByRole('button', { name: save }).click();
}

test.describe('English browser', () => {
	test.use({ locale: 'en-GB' });

	test('shows the login page, the tabs and the wizard in English', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));

		await page.goto('/#/login');
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');

		await signIn(page, 'Save');
		await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Offers' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'System', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Excel' })).toBeVisible();

		await page.goto('/#/new');
		await expect(page.getByRole('heading', { name: 'Seller' })).toBeVisible();
		await expect(page.getByLabel('Document type')).toBeVisible();
		await page.getByRole('button', { name: 'Next' }).click();
		await expect(page.getByRole('heading', { name: 'Buyer' })).toBeVisible();
		await page.getByRole('button', { name: 'Next' }).click();
		await expect(page.getByRole('heading', { name: 'Items & dates' })).toBeVisible();
		expect(errors).toEqual([]);
	});

	test('shows the other tabs in English too', async ({ page }) => {
		await page.goto('/#/login');
		await signIn(page, 'Save');

		const pages: [string, string][] = [
			['#/offers', 'Offers'],
			['#/customers', 'Customers'],
			['#/products', 'Items'],
			['#/backup', 'Backup & restore'],
			['#/company', 'Company (seller master data)'],
			['#/invoice-templates', 'Invoice templates'],
			['#/templates', 'Print templates'],
		];
		for (const [hash, text] of pages) {
			await page.goto(`/${hash}`);
			await expect(page.locator('#view')).toContainText(text);
		}
	});

	test('lets the address bar bring the German back, and remembers it', async ({ page }) => {
		await page.goto('/?lang=de#/login');
		await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', 'de');

		// the choice stays on this device: the next visit needs no parameter
		await page.goto('/#/login');
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();
	});
});

test.describe('German browser', () => {
	test.use({ locale: 'de-DE' });

	test('stays German without any parameter and can be switched to English', async ({ page }) => {
		await page.goto('/#/login');
		await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();

		await page.goto('/?lang=en#/login');
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		// leave the device on German for the other specs
		await page.goto('/?lang=de#/login');
		await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();
	});
});
