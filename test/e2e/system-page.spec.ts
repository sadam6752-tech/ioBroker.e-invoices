/**
 * 1.0.1: the system page holds what is rarely needed — status, backup, company data and the look of the
 * app. The tabs "Backup" and "Firma" are gone from the bar; their old addresses still open the page and
 * scroll to their part.
 */
import { expect, test } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

test('puts status, backup, company and appearance on one page and keeps the old addresses', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();

	await page.goto('/#/status');
	const nav = page.locator('header.top nav');
	await expect(nav.getByRole('link', { name: 'System', exact: true })).toHaveClass(/active/);
	// the bar no longer carries the two rarely used tabs
	await expect(nav.getByRole('link', { name: 'Backup', exact: true })).toHaveCount(0);
	await expect(nav.getByRole('link', { name: 'Firma', exact: true })).toHaveCount(0);

	// all four parts are on the page
	await expect(page.locator('#sys-status')).toContainText('Version');
	await expect(page.locator('#sys-backup')).toContainText('Backup & Wiederherstellung');
	await expect(page.locator('#sys-company #c-name')).toBeVisible();
	await expect(page.locator('#sys-theme #s-theme')).toBeVisible();

	// the old addresses open the same page, mark "System" as the active tab and scroll to their part
	await page.goto('/#/backup');
	await expect(page.locator('#sys-backup')).toBeInViewport();
	await expect(nav.getByRole('link', { name: 'System', exact: true })).toHaveClass(/active/);
	await page.goto('/#/company');
	await expect(page.locator('#sys-company')).toBeInViewport();
	expect(errors).toEqual([]);
});
