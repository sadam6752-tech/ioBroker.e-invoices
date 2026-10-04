/**
 * 1.0.1: the system page holds what is rarely needed — status (with the appearance of the app), backup,
 * company data and print templates — behind a row of tabs inside the page, one topic at a time. The tabs
 * "Backup", "Firma" and "Druckvorlagen" are gone from the header bar; their old addresses are the tabs.
 */
import { expect, test } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

test('shows one topic at a time behind tabs inside the system page and keeps the old addresses', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();

	await page.goto('/#/status');
	const nav = page.locator('header.top nav');
	await expect(nav.getByRole('link', { name: 'System', exact: true })).toHaveClass(/active/);
	// the bar no longer carries the rarely used tabs
	for (const name of ['Backup', 'Firma', 'Druckvorlagen']) {
		await expect(nav.getByRole('link', { name })).toHaveCount(0);
	}

	// the tabs inside the page
	const tabs = page.locator('nav.subtabs');
	await expect(tabs.locator('a')).toHaveText(['Status', 'Backup', 'Firma', 'Druckvorlagen']);
	await expect(tabs.getByRole('link', { name: 'Status' })).toHaveClass(/active/);

	// Status: the status and the appearance, nothing of the other topics
	await expect(page.locator('#sys-status')).toContainText('Version');
	await expect(page.locator('#sys-theme #s-theme')).toBeVisible();
	await expect(page.locator('#sys-backup, #sys-company, #sys-templates')).toHaveCount(0);

	// Backup
	await tabs.getByRole('link', { name: 'Backup' }).click();
	await expect(page).toHaveURL(/#\/backup$/);
	await expect(tabs.getByRole('link', { name: 'Backup' })).toHaveClass(/active/);
	await expect(page.locator('#sys-backup')).toContainText('Backup & Wiederherstellung');
	await expect(page.locator('#sys-status, #sys-company, #sys-templates, #s-theme')).toHaveCount(0);

	// Firma
	await tabs.getByRole('link', { name: 'Firma' }).click();
	await expect(page.locator('#sys-company #c-name')).toBeVisible();
	await expect(page.locator('#sys-backup, #sys-templates')).toHaveCount(0);

	// Druckvorlagen
	await tabs.getByRole('link', { name: 'Druckvorlagen' }).click();
	await expect(page.locator('#sys-templates #t-new')).toBeVisible();
	await expect(page.locator('#sys-company')).toHaveCount(0);

	// the old addresses open the same page on their tab, with "System" as the active header tab
	for (const [address, tab] of [
		['/#/backup', 'Backup'],
		['/#/company', 'Firma'],
		['/#/templates', 'Druckvorlagen'],
		['/#/status', 'Status'],
	] as const) {
		await page.goto(address);
		await expect(tabs.getByRole('link', { name: tab })).toHaveClass(/active/);
		await expect(nav.getByRole('link', { name: 'System', exact: true })).toHaveClass(/active/);
	}
	expect(errors).toEqual([]);
});
