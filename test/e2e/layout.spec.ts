/**
 * Layout test on a phone viewport.
 *
 * The app is a PWA that is used on a phone as well, so every page has to fit into the
 * width of the screen: nothing may stick out to the right and force horizontal scrolling
 * (a table with fixed widths once did exactly that in the wizard).
 */
import { expect, test, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/** Routes of the navigation, as a user reaches them. */
const routes = [
	'/#/',
	'/#/offers',
	'/#/new',
	'/#/templates',
	'/#/company',
	'/#/customers',
	'/#/products',
	'/#/invoice-templates',
	'/#/backup',
	'/#/status',
];

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

test('keeps every page inside the width of a phone', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 780 });
	await signIn(page);

	for (const route of routes) {
		await page.goto(route);
		// measure the settled page, not one that is still fetching
		await page.waitForLoadState('networkidle');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow, `${route} scrolls horizontally`).toBeLessThanOrEqual(1);
	}
});

test('keeps the navigation reachable on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 780 });
	await signIn(page);
	await page.goto('/#/');

	// every link of the shell is visible and offers a target a finger can hit (≥ 24 px)
	const links = page.locator('header.top nav a');
	const count = await links.count();
	expect(count).toBeGreaterThan(8);
	for (let index = 0; index < count; index++) {
		const link = links.nth(index);
		await expect(link).toBeVisible();
		const box = await link.boundingBox();
		expect(box?.height ?? 0, `link ${index} is too small to tap`).toBeGreaterThanOrEqual(24);
	}
});
