/**
 * XRechnung (R6.1) in the browser: the wizard asks for the Leitweg-ID and the contact person as soon as the
 * format is switched, and the detail page of an issued XRechnung offers the XML as the invoice and the PDF as a
 * view — without the mail button that would send the PDF as if it were the invoice.
 *
 * The records come from the API like in the other suites; the interesting part is what the screens make of them.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/** Header every API call of this suite needs while a token is configured. */
const auth = { authorization: `Bearer ${token}` };

const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
	email: 'rechnung@muster.example',
	phone: '030 1234567',
	contactName: 'Erika Mustermann',
};

const buyer = {
	name: 'Stadt Beispielhausen',
	street: 'Rathausplatz 1',
	zip: '80331',
	city: 'München',
	country: 'DE',
	email: 'rechnungseingang@beispielhausen.example',
	leitwegId: '991-01234-44',
	customerNumber: 'K-77',
};

/**
 * Creates a draft through the API.
 *
 * @param request - Playwright API client bound to the test server
 * @param data - fields on top of the fixed parties and one line
 */
async function createDraft(request: APIRequestContext, data: Record<string, unknown>): Promise<string> {
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller,
			buyer,
			lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
			documentTitle: 'Rechnung',
			...data,
		},
	});
	expect(created.status()).toBe(201);
	return ((await created.json()) as { id: string }).id;
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

test('switching the format in the wizard asks for the Leitweg-ID and the contact person', async ({ page, request }) => {
	const id = await createDraft(request, {
		seller: { ...seller, contactName: '' },
		buyer: { ...buyer, leitwegId: '' },
	});
	await signIn(page);
	await page.goto(`/#/edit/${id}`);

	// a ZUGFeRD draft asks for the customer number only
	const format = page.locator('#w-profile');
	await expect(format).toHaveValue('EN16931');
	await expect(page.getByLabel('Ansprechpartner (BT-41) *')).toHaveCount(0);

	await format.selectOption('XRECHNUNG');
	await expect(page.getByLabel('Ansprechpartner (BT-41) *')).toBeVisible();
	await page.getByRole('button', { name: 'Weiter' }).click();
	const leitweg = page.getByLabel('Leitweg-ID (BT-10) *');
	await expect(leitweg).toBeVisible();
	await expect(page.getByLabel('Kundennummer (BT-10) *')).toHaveCount(0);

	// the format travels with the draft
	await leitweg.fill('04011000-12345-67');
	await page.getByRole('button', { name: 'Weiter' }).click();
	await page.getByRole('button', { name: 'Weiter' }).click();
	await page.getByRole('button', { name: 'Entwurf speichern' }).click();
	await expect
		.poll(async () => {
			const stored = await request.get(`/api/invoices/${id}`, { headers: auth });
			const body = (await stored.json()) as { profile: string; buyer: { leitwegId?: string } };
			return `${body.profile} ${body.buyer.leitwegId ?? ''}`;
		})
		.toBe('XRECHNUNG 04011000-12345-67');
});

test('an issued XRechnung offers the XML as the invoice and the PDF as a view', async ({ page, request }) => {
	const id = await createDraft(request, { profile: 'XRECHNUNG' });
	const issued = await request.post(`/api/invoices/${id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	const number = ((await issued.json()) as { number: string }).number;

	await signIn(page);
	await page.goto(`/#/invoices/${id}`);
	await expect(page.locator('#view strong').first()).toHaveText(number);
	await expect(page.locator('#d-xrechnung')).toContainText('XRechnung');
	await expect(page.getByRole('button', { name: 'XRechnung (XML) ↓' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'PDF (Ansicht) ↓' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'E-Mail (PDF)' })).toHaveCount(0);

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'XRechnung (XML) ↓' }).click(),
	]);
	expect(download.suggestedFilename()).toBe(`${number}.xml`);

	// the artifact is the XRechnung, the PDF carries no XML
	const xml = await request.get(`/api/invoices/${id}.xml`, { headers: auth });
	expect(await xml.text()).toContain('urn:xeinkauf.de:kosit:xrechnung_3.0');
	const pdf = await (await request.get(`/api/invoices/${id}.pdf`, { headers: auth })).body();
	expect(pdf.toString('latin1')).not.toMatch(/EmbeddedFile|AFRelationship/);
});

test('a ZUGFeRD invoice keeps its mail button and its PDF button', async ({ page, request }) => {
	const id = await createDraft(request, {});
	const issued = await request.post(`/api/invoices/${id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	await signIn(page);
	await page.goto(`/#/invoices/${id}`);
	await expect(page.getByRole('button', { name: 'PDF ↓', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'E-Mail (PDF)' })).toBeVisible();
	await expect(page.locator('#d-xrechnung')).toHaveCount(0);
});
