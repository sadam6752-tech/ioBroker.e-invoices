/**
 * 0.9.2: the backup page says what the automatic backup does and warns when no backup is current.
 * After "Jetzt sichern" there is a current backup, so the warning is gone.
 */
import { expect, test } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

test('shows the state of the automatic backup and no warning after a backup', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/#/login');
	await page.getByLabel('API-Token').fill(token);
	await page.getByRole('button', { name: 'Speichern' }).click();
	await page.goto('/#/backup');

	// the end-to-end server runs without an automatic backup, and the page says so
	await expect(page.locator('#b-auto')).toContainText('Automatisches Backup ist aus');

	await page.getByRole('button', { name: 'Jetzt sichern' }).click();
	await expect(page.locator('#b-warning')).toHaveCount(0);
	await expect(page.locator('#b-auto')).toBeVisible();
	expect(errors).toEqual([]);
});
