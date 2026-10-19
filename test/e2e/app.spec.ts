/**
 * Smoke tests of the web app.
 *
 * They run against `test/e2e/server.mjs`, which starts the real API on a throwaway data
 * directory and serves the built web app (see `playwright.config.ts`); the service worker
 * is blocked on purpose so a fresh build is never hidden behind a cache.
 */
import { expect, test, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/**
 * Signs in through the login page, the way a user does.
 *
 * @param page - page under test
 * @param value - token to store in the browser
 */
async function signIn(page: Page, value: string = token): Promise<void> {
	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(value);
	await page.getByRole('button', { name: 'Speichern' }).click();
}

test('asks for the token when the API refuses the request', async ({ page }) => {
	// without a token the list request is answered with 401 and the app redirects
	// (`/api/health` stays open on purpose, so the status page would not do here)
	await page.goto('/#/');

	await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();
	await expect(page.locator('#f-status')).toHaveCount(0);
});

test('refuses a wrong token and lets the right one in', async ({ page }) => {
	await signIn(page, 'falsch-2026');
	await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();

	await signIn(page);
	// the dashboard is the page with the list filter and the export buttons
	await expect(page.locator('#f-status')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Excel' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Rechnungen' })).toBeVisible();
});

test('opens the wizard without a page error', async ({ page }) => {
	// Regression 30.09.2026: `bootLists()` ran before `let listsLoaded` was initialized
	// (temporal dead zone), so `#/new` died with "can't access lexical declaration
	// before initialization" — an error no unit test had seen.
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));

	await signIn(page);
	await page.goto('/#/new');

	await expect(page.getByRole('heading', { name: 'Verkäufer' })).toBeVisible();
	expect(errors).toEqual([]);
});

test('reports the health of the API on the status page', async ({ page }) => {
	await signIn(page);
	await page.goto('/#/status');

	await expect(page.getByText('Version: 0.0.1-e2e')).toBeVisible();
	// the liability clause sits on the status page
	await expect(page.locator('#s-disclaimer')).toContainText('Haftungsausschluss');
	// the counters come from the database of this run
	await expect(page.locator('pre.dump')).toContainText('draft');
});

test('asks before signing out and signs out only after a yes', async ({ page }) => {
	await signIn(page);
	await expect(page.locator('#f-status')).toBeVisible();

	// a "no" keeps the session: still on the dashboard, the token is still there
	const questions: string[] = [];
	page.once('dialog', dialog => {
		questions.push(dialog.message());
		void dialog.dismiss();
	});
	await page.getByRole('link', { name: 'Logout' }).click();
	await expect.poll(() => questions).toEqual(['Wirklich abmelden?']);
	await expect(page.locator('#f-status')).toBeVisible();

	// a "yes" signs out
	page.once('dialog', dialog => void dialog.accept());
	await page.getByRole('link', { name: 'Logout' }).click();
	await expect(page.getByRole('heading', { name: 'Anmeldung' })).toBeVisible();
});

test('says what to do when the server gives no answer, and goes away when it answers again', async ({ page }) => {
	await signIn(page);
	await expect(page.locator('#f-status')).toBeVisible();

	// no answer at all, as with a certificate the browser no longer accepts
	await page.route('**/api/**', route => route.abort('failed'));
	await page.getByRole('link', { name: 'Angebote' }).click();
	const banner = page.locator('#net-problem');
	await expect(banner).toBeVisible();
	await expect(banner).toContainText('Der Server ist nicht erreichbar.');
	await expect(banner.getByRole('link')).toHaveAttribute('href', /^https?:\/\/[^/]+\/$/);
	// the error in the page is readable instead of the browser's "NetworkError"
	await expect(page.locator('#view')).toContainText('Der Server ist nicht erreichbar.');

	// the server answers again: reloading brings the page back without the banner
	await page.unroute('**/api/**');
	await banner.getByRole('button', { name: 'Neu laden' }).click();
	await expect(page.locator('#net-problem')).toHaveCount(0);
	await expect(page.locator('#view')).not.toContainText('Der Server ist nicht erreichbar.');
	await expect(page.locator('#view .card').first()).toBeVisible();
});
