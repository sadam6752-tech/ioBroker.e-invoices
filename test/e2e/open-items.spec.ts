/**
 * R6.2: the open-items page shows what the API computes — the aging list, the
 * sums per bucket, the overdue filter and the dashboard tile.
 *
 * All specs share one throw-away server, so nothing here assumes an empty
 * database: the invoices of this spec carry their own customer names and the
 * sums on the page are compared with the answer of the API.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const auth = { authorization: `Bearer ${token}` };

const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};

/** What the page shows for an amount (`eur()` of the web app). */
const eur = (value: number): string => `${value.toFixed(2)} EUR`;

/** The part of the report this spec compares. */
interface Report {
	total: { count: number; amount: number };
	overdue: { count: number; amount: number };
	items: { customer: string; bucket: string; amount: number; id: string }[];
}

/**
 * Issues an invoice with a due date.
 *
 * @param request - Playwright API client bound to the test server
 * @param customer - buyer name
 * @param net - net price of the single line (19 % VAT)
 * @param dueDate - ISO due date
 */
async function issue(request: APIRequestContext, customer: string, net: number, dueDate: string): Promise<string> {
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller,
			buyer: {
				name: customer,
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				customerNumber: 'K-77',
			},
			lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: net, vatRate: 19 }],
			issueDate: '2026-01-10',
			deliveryDate: '2026-01-10',
			dueDate,
			currency: 'EUR',
		},
	});
	expect(created.status()).toBe(201);
	const draft = (await created.json()) as { id: string };
	const issued = await request.post(`/api/invoices/${draft.id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	return draft.id;
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

test('shows the aging list with the sums of the API and filters the overdue part', async ({ page, request }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await issue(request, 'OPOS Alt AG', 1000, '2026-01-31'); // long overdue
	const future = await issue(request, 'OPOS Frisch KG', 100, '2099-12-31'); // not due for a long time
	await signIn(page);

	await page.goto('/#/open-items');
	await expect(page.getByRole('heading', { name: 'Alterung' })).toBeVisible();

	// the page shows the sums the API computes, not its own
	const report = (await (await request.get('/api/open-items', { headers: auth })).json()) as Report;
	await expect(page.locator('#op-total')).toContainText(eur(report.total.amount));
	await expect(page.locator('#op-total')).toContainText(String(report.total.count));
	await expect(page.locator('#op-overdue-sum')).toContainText(eur(report.overdue.amount));

	// both invoices are listed with their age
	const alt = page.locator('table').last().locator('tr', { hasText: 'OPOS Alt AG' });
	await expect(alt).toContainText('über 90 Tage überfällig');
	await expect(alt).toContainText(eur(1190));
	const frisch = page.locator('table').last().locator('tr', { hasText: 'OPOS Frisch KG' }).last();
	await expect(frisch).toContainText('nicht fällig');

	// the overdue filter drops what is not due yet
	await page.getByLabel('nur überfällige').check();
	await expect(page.locator('table').last().locator('tr', { hasText: 'OPOS Frisch KG' })).toHaveCount(0);
	await expect(page.locator('table').last().locator('tr', { hasText: 'OPOS Alt AG' }).last()).toBeVisible();

	// a paid invoice leaves the list
	const paid = await request.post(`/api/invoices/${future}/paid`, { headers: auth, data: { paid: true } });
	expect(paid.status()).toBe(200);
	await page.getByLabel('nur überfällige').uncheck();
	await expect(page.locator('table').last().locator('tr', { hasText: 'OPOS Frisch KG' })).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('puts the claim on the dashboard and links to the aging list', async ({ page, request }) => {
	await issue(request, 'OPOS Kachel AG', 200, '2026-01-31');
	await signIn(page);
	await page.goto('/#/');

	const tile = page.locator('#open-tile');
	await expect(tile).toContainText('Offene Posten');
	await expect(tile).toContainText('überfällig');
	await tile.getByRole('link', { name: 'Alterungsliste' }).click();
	await expect(page.getByRole('heading', { name: 'Alterung' })).toBeVisible();
});

test('speaks English with an English browser', async ({ browser, request }) => {
	const context = await browser.newContext({ locale: 'en-GB' });
	const page = await context.newPage();
	await issue(request, 'OPOS English AG', 100, '2026-01-31');
	await page.goto('/#/login');
	await page.getByLabel(/api.token/i).fill(token);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.goto('/#/open-items');
	await expect(page.getByRole('heading', { name: 'Aging' })).toBeVisible();
	await expect(page.locator('table').last().locator('tr', { hasText: 'OPOS English AG' })).toContainText(
		'over 90 days overdue',
	);
	await context.close();
});
