/**
 * The layout studio carries two header distances: where the logo starts and where
 * the header text starts, both in mm from the top edge of the sheet. The form
 * stores them, shows them again, and an empty field takes them back.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

/** What the API stores of the two settings. */
interface Stored {
	id: string;
	definition: { logoTopMm?: number; textTopMm?: number };
}

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
 * Makes sure a layout template exists and returns it.
 *
 * @param request - Playwright API client bound to the test server
 */
async function ensureTemplate(request: APIRequestContext): Promise<Stored> {
	const list = (await (await request.get('/api/templates', { headers: auth })).json()) as Stored[];
	if (list.length > 0) {
		return list[0];
	}
	// the page offers "+ Neu" only with a base template, so one is created first
	const created = await request.post('/api/templates', {
		headers: auth,
		data: {
			name: 'Standard',
			definition: {
				version: 1,
				name: 'Standard',
				colors: { primary: '#1a56db', text: '#111827', muted: '#555555' },
				usePrimaryColor: true,
				titleAccent: true,
				tableHeaderAccent: false,
				showEmail: true,
				showCustomerNumber: true,
				showPaymentTerms: true,
				footerText: '',
				showArchiveHint: false,
				showPageNumbers: false,
				blocks: {
					title: true,
					meta: true,
					parties: true,
					positions: true,
					totals: true,
					payment: true,
					notes: true,
				},
			},
		},
	});
	expect(created.status()).toBe(201);
	return (await created.json()) as Stored;
}

/**
 * Reads one template back from the API.
 *
 * @param request - Playwright API client bound to the test server
 * @param id - template id
 */
async function stored(request: APIRequestContext, id: string): Promise<Stored> {
	return (await (await request.get(`/api/templates/${id}`, { headers: auth })).json()) as Stored;
}

test('stores the logo and text distances, shows them again and takes them back', async ({ page, request }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	const template = await ensureTemplate(request);
	await signIn(page);
	await page.goto('/#/templates');

	await page.locator(`[data-edit="${template.id}"]`).click();

	const logoTop = page.getByLabel('Logo-Abstand oben (mm)');
	const textTop = page.getByLabel('Text-Abstand oben (mm)');
	await expect(logoTop).toBeVisible();
	// empty by default: the layout is the one the template always had
	await expect(logoTop).toHaveValue('');
	await expect(logoTop).toHaveAttribute('placeholder', '12,7');
	await expect(textTop).toHaveValue('');

	await logoTop.fill('25');
	await textTop.fill('62.5');
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.locator(`[data-edit="${template.id}"]`)).toBeVisible();
	expect((await stored(request, template.id)).definition).toMatchObject({ logoTopMm: 25, textTopMm: 62.5 });

	// the form shows what was stored
	await page.locator(`[data-edit="${template.id}"]`).click();
	await expect(page.getByLabel('Logo-Abstand oben (mm)')).toHaveValue('25');
	await expect(page.getByLabel('Text-Abstand oben (mm)')).toHaveValue('62.5');

	// a value outside the sheet is refused by the server and the form says so
	await page.getByLabel('Logo-Abstand oben (mm)').fill('999');
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.locator('p.error')).toContainText('Logo-Abstand oben');
	expect((await stored(request, template.id)).definition.logoTopMm).toBe(25);

	// empty fields take the distances back
	await page.getByLabel('Logo-Abstand oben (mm)').fill('');
	await page.getByLabel('Text-Abstand oben (mm)').fill('');
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page.locator(`[data-edit="${template.id}"]`)).toBeVisible();
	const after = (await stored(request, template.id)).definition;
	expect(after.logoTopMm).toBeUndefined();
	expect(after.textTopMm).toBeUndefined();
	expect(errors).toEqual([]);
});
