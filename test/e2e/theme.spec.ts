/**
 * 0.9.5: light / dark theme. The status page offers System / Hell / Dunkel; the choice is kept on
 * the device and applied before the first paint, "System" follows the device, and the colors really
 * change (the page background is the one of the theme).
 */
import { expect, test, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

const LIGHT_BG = 'rgb(244, 246, 251)';
const DARK_BG = 'rgb(11, 18, 32)';

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
 * Theme and page background as the browser computes them.
 *
 * @param page - page under test
 */
async function look(page: Page): Promise<{ theme: string | null; background: string }> {
	return page.evaluate(() => ({
		theme: document.documentElement.getAttribute('data-theme'),
		background: getComputedStyle(document.body).backgroundColor,
	}));
}

test('follows the device on "System" and obeys an explicit choice that survives a reload', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));

	// a device that prefers dark: the default "System" is dark
	await page.emulateMedia({ colorScheme: 'dark' });
	await signIn(page);
	await page.goto('/#/status');
	await expect(page.locator('#s-theme')).toHaveValue('system');
	expect(await look(page)).toEqual({ theme: 'dark', background: DARK_BG });

	// the user insists on light: the device does not matter any more
	await page.locator('#s-theme').selectOption('light');
	expect(await look(page)).toEqual({ theme: 'light', background: LIGHT_BG });
	await page.reload();
	await expect(page.locator('#s-theme')).toHaveValue('light');
	expect(await look(page)).toEqual({ theme: 'light', background: LIGHT_BG });

	// a device that prefers light, the user chooses dark: it stays dark
	await page.emulateMedia({ colorScheme: 'light' });
	await page.locator('#s-theme').selectOption('dark');
	expect(await look(page)).toEqual({ theme: 'dark', background: DARK_BG });
	await page.reload();
	expect(await look(page)).toEqual({ theme: 'dark', background: DARK_BG });

	// back to "System": the stored choice is gone and the (light) device decides again
	await page.locator('#s-theme').selectOption('system');
	expect(await look(page)).toEqual({ theme: 'light', background: LIGHT_BG });
	expect(await page.evaluate(() => localStorage.getItem('e-invoices.theme'))).toBeNull();

	// "System" follows the device while the page is open
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect.poll(async () => (await look(page)).theme).toBe('dark');
	expect(errors).toEqual([]);
});

test('is applied before the first paint and the other pages use the theme colors', async ({ page }) => {
	await signIn(page);
	await page.goto('/#/status');
	await page.locator('#s-theme').selectOption('dark');

	// a fresh load: the early script has set the theme by the time the document is parsed
	await page.goto('/#/');
	await page.reload({ waitUntil: 'commit' });
	await page.waitForFunction(() => document.readyState !== 'loading');
	expect((await look(page)).theme).toBe('dark');

	// cards, inputs and buttons take the dark colors, not the light ones
	await expect(page.locator('#f-q')).toBeVisible();
	const colors = await page.evaluate(() => {
		const style = (selector: string, property: 'backgroundColor' | 'color'): string =>
			getComputedStyle(document.querySelector(selector)!)[property];
		return {
			card: style('.card', 'backgroundColor'),
			inputBackground: style('#f-q', 'backgroundColor'),
			inputText: style('#f-q', 'color'),
		};
	});
	expect(colors.card).toBe('rgb(21, 30, 46)');
	expect(colors.inputBackground).toBe('rgb(15, 23, 42)');
	expect(colors.inputText).toBe('rgb(229, 231, 235)');
});
