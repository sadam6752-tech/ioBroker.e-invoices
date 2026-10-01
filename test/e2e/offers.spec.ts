/**
 * The chain a user walks through for an offer (R8) — through the browser only:
 * create the offer in the wizard, issue it, record the customer's "yes" and turn it
 * into an invoice draft. The last step checks what the two lists show afterwards: the
 * booking list must not carry the A-number, and neither must the accounting export.
 *
 * The three cases below fill the gaps of that walk: the "no" of the customer with the
 * sent mark, the batch issue of the drafts a search shows, the second invoice out of
 * one offer (partial and final) and the expired state. They set their records up
 * through the API like `sample-cases.spec.ts` does and then judge the screens — the
 * interesting part is what the PWA makes of those states, not how they got there.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/** Header every API call of this suite needs while a token is configured. */
const auth = { authorization: `Bearer ${token}` };

/** Seller the API needs for a record of this suite. */
const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
};

/** An offer of this suite, issued or still a draft. */
interface OfferRecord {
	/** Database id. */
	id: string;
	/** Offer number, empty while the record is a draft. */
	number: string;
}

/**
 * A day relative to today — the offer state is judged against today's date, so
 * every date of these tests is derived the same way the app derives it (UTC).
 *
 * @param offset - Days from today, may be negative
 */
function day(offset: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString().slice(0, 10);
}

/**
 * Creates an offer draft and issues it unless told otherwise.
 *
 * @param request - Playwright API client bound to the test server
 * @param data - Fields on top of the default body of this suite
 * @param issue - `false` leaves the record a draft
 */
async function createOffer(
	request: APIRequestContext,
	data: Record<string, unknown> = {},
	issue = true,
): Promise<OfferRecord> {
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			docType: 'quote',
			seller,
			buyer: {
				name: 'Kunde AG',
				street: 'Kundenweg 5',
				zip: '80331',
				city: 'München',
				country: 'DE',
				// BT-10: mandatory on the German e-invoice, so a converted draft
				// can be issued without further edits
				customerNumber: 'K-1',
			},
			lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
			issueDate: day(0),
			// the delivery date is a required field of both document types and
			// becomes the service date of the invoice when the offer is converted
			deliveryDate: day(-1),
			...data,
		},
	});
	expect(created.status()).toBe(201);
	const draft = (await created.json()) as { id: string };
	if (!issue) {
		return { id: draft.id, number: '' };
	}
	const issued = await request.post(`/api/invoices/${draft.id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	const body = (await issued.json()) as { id: string; number: string };
	return { id: body.id, number: body.number };
}

/**
 * Reads the id of the draft the detail page has just offered to open.
 *
 * @param page - page under test
 */
async function convertedDraftId(page: Page): Promise<string> {
	const link = page.getByRole('link', { name: 'Entwurf öffnen' });
	await expect(link).toBeVisible();
	return ((await link.getAttribute('href')) ?? '').replace('#/edit/', '');
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
 * Fills one address block of the wizard.
 *
 * @param page - page under test
 * @param side - `seller` or `buyer`
 * @param party - Values to type
 */
async function fillParty(page: Page, side: 'seller' | 'buyer', party: Record<string, string>): Promise<void> {
	for (const [field, value] of Object.entries(party)) {
		await page.locator(`input[data-p="${side}"][data-f="${field}"]`).fill(value);
	}
}

test('walks an offer from the wizard to the invoice draft', async ({ page }) => {
	// the wizard and the detail page ask before they act (GoBD)
	page.on('dialog', dialog => void dialog.accept());
	await signIn(page);

	// 1. the entry point of an offer is the tab — the type is preselected there
	await page.goto('/#/offers');
	await page.getByRole('link', { name: '+ Neues Angebot' }).click();
	await expect(page.locator('#w-doctype')).toHaveValue('quote');

	// 2. Verkäufer (a quotation needs no BT-10, so the customer number stays empty)
	await fillParty(page, 'seller', {
		name: 'Muster GmbH',
		street: 'Beispielstr. 1',
		zip: '10115',
		city: 'Berlin',
		vatId: 'DE123456789',
	});
	await page.getByRole('button', { name: 'Weiter' }).click();

	// 3. Käufer
	await fillParty(page, 'buyer', {
		name: 'Kunde AG',
		street: 'Kundenweg 5',
		zip: '80331',
		city: 'München',
	});
	await page.getByRole('button', { name: 'Weiter' }).click();

	// 4. Positionen: the offer is asked for its validity, not for a due date
	await expect(page.locator('#w-valid')).toBeVisible();
	await expect(page.locator('#w-due')).toHaveCount(0);
	await page.locator('input[data-l="0.description"]').fill('Beratung');
	await page.locator('input[data-l="0.unitPriceNet"]').fill('100');
	await page.getByRole('button', { name: 'Weiter' }).click();

	// 5. review: 100 + 19 % VAT and the offer wording
	await expect(page.locator('#view')).toContainText('119.00 EUR');
	await expect(page.locator('#view')).toContainText('ein Angebot ist keine E-Rechnung');
	await page.getByRole('button', { name: 'Entwurf speichern' }).click();

	// 6. issuing gives the offer its own number circle and a plain sight PDF
	const number = await (async (): Promise<string> => {
		await expect(page.getByRole('button', { name: 'Ausstellen' })).toBeVisible();
		await page.getByRole('button', { name: 'Ausstellen' }).click();
		const heading = page.locator('#view strong').first();
		await expect(heading).toHaveText(/^A-\d{4}-\d{2}-\d{3}$/);
		return (await heading.textContent()) ?? '';
	})();
	expect(number).toMatch(/^A-\d{4}-\d{2}-\d{3}$/);
	// an offer is never paid: the booking checkbox stays away
	await expect(page.locator('#d-paid')).toHaveCount(0);
	await expect(page.locator('#view')).toContainText('Gültig bis:');

	// 7. the customer says yes, and the decision is on the page afterwards
	await page.getByRole('button', { name: 'Annehmen' }).click();
	await expect(page.locator('#view .badge.accepted')).toHaveText('Angenommen');
	await expect(page.getByRole('button', { name: 'Ablehnen' })).toHaveCount(0);

	// 8. the accepted offer becomes an invoice *draft*
	await page.getByRole('button', { name: 'In Rechnung umwandeln' }).click();
	const draftLink = page.getByRole('link', { name: 'Entwurf öffnen' });
	await expect(draftLink).toBeVisible();
	const draftId = ((await draftLink.getAttribute('href')) ?? '').replace('#/edit/', '');
	expect(draftId).not.toBe('');

	// 9. both sides of the chain know each other
	await expect(page.locator('#view')).toContainText('Daraus hervorgegangene Rechnung(en)');
	await page.goto(`/#/invoices/${draftId}`);
	await expect(page.locator('#view')).toContainText('Zugrunde liegendes Angebot');
	await expect(page.locator('#view')).toContainText(number);

	// 10. the booking list stays a booking list: no A-number in it
	await page.goto('/#/');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('#list')).not.toContainText(number);

	// 11. and the accounting export of the list does not carry the offer either
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'CSV' }).click(),
	]);
	const path = await download.path();
	expect(path, 'the CSV export was not written').toBeTruthy();
	expect(readFileSync(path, 'utf8')).not.toContain(number);

	// 12. the offer tab shows it with its state
	await page.goto('/#/offers');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('#o-list')).toContainText(number);
	await expect(page.locator('#o-list')).toContainText('Angenommen');
});

test('records the "no" of the customer and the sent mark', async ({ page, request }) => {
	// the prompt carries the reason, so the dialog handler answers a prompt with a
	// text while the plain confirm dialogs stay empty
	page.on('dialog', dialog => void (dialog.type() === 'prompt' ? dialog.accept('zu teuer') : dialog.accept()));
	const offer = await createOffer(request, {
		buyer: { name: 'Absage AG', street: 'Abweg 3', zip: '50667', city: 'Köln', country: 'DE' },
	});
	await signIn(page);

	// 1. being sent is a mark the user sets by hand; the badge replaces the button
	await page.goto(`/#/invoices/${offer.id}`);
	await page.getByRole('button', { name: 'Als versendet markieren' }).click();
	await expect(page.locator('#d-out')).toContainText('Als versendet markiert');
	await expect(page.locator('#d-sent')).toHaveCount(0);
	await page.reload();
	await expect(page.locator('.badge.issued')).toHaveText('versendet');

	// 2. the "no" is final and stands on the offer with its reason
	await page.getByRole('button', { name: 'Ablehnen' }).click();
	await expect(page.locator('.badge.rejected')).toHaveText('Abgelehnt');
	await expect(page.locator('#view')).toContainText('Abgelehnt am');
	await expect(page.locator('#view')).toContainText('zu teuer');
	await expect(page.getByRole('button', { name: 'Annehmen' })).toHaveCount(0);

	// 3. the offer list offers that state as a filter and repeats the reason
	await page.goto('/#/offers');
	await page.locator('#o-state').selectOption('rejected');
	await expect(page.locator('#o-list')).toContainText(offer.number);
	await expect(page.locator('#o-list')).toContainText('zu teuer');
});

test('issues the drafts a search shows and splits an accepted offer', async ({ page, request }) => {
	page.on('dialog', dialog => void dialog.accept());
	// a marker only these drafts carry: the search narrows the batch to them, so
	// the count on the button and the list stay predictable
	const marker = `Sammelkunde ${Date.now()}`;
	const buyer = {
		name: marker,
		street: 'Sammelweg 1',
		zip: '20095',
		city: 'Hamburg',
		country: 'DE',
		customerNumber: 'K-77',
	};
	const first = await createOffer(request, { buyer }, false);
	const second = await createOffer(request, { buyer }, false);

	await signIn(page);
	await page.goto('/#/offers');
	await page.locator('#o-q').fill(marker);

	// 1. the batch button counts what the filter shows and issues all of them
	const issueAll = page.locator('#o-issue-all');
	await expect(issueAll).toBeVisible();
	await expect(issueAll).toHaveText('Ausstellen (2)');
	await issueAll.click();
	await expect(page.locator('#o-err')).toContainText('2 ausgestellt');
	await expect(page.locator('#o-list .card')).toHaveCount(2);
	await expect(page.locator('#o-list')).toContainText('Offen');
	for (const draft of [first, second]) {
		const issued = await request.get(`/api/invoices/${draft.id}`, { headers: auth });
		expect(issued.status()).toBe(200);
		expect(((await issued.json()) as { number: string }).number).toMatch(/^A-\d{4}-\d{2}-\d{3}$/);
	}

	// 2. one offer, two invoices: the partial one first, the rest later
	const split = await createOffer(request, {
		buyer: {
			name: 'Teilauftrag AG',
			street: 'Teilweg 2',
			zip: '60311',
			city: 'Frankfurt',
			country: 'DE',
			customerNumber: 'K-88',
		},
	});
	await request.post(`/api/invoices/${split.id}/quote-accept`, { headers: auth, data: {} });
	await page.goto(`/#/invoices/${split.id}`);
	await page.getByRole('button', { name: 'In Rechnung umwandeln' }).click();
	const firstDraft = await convertedDraftId(page);
	// while that draft is open the server refuses a second one …
	const refused = await request.post(`/api/invoices/${split.id}/convert`, { headers: auth, data: {} });
	expect(refused.status()).toBe(400);
	expect(String(((await refused.json()) as { error: string }).error)).toContain('already exists');
	// … and issuing it frees the offer for the second, final invoice
	const issuedFirst = await request.post(`/api/invoices/${firstDraft}/issue`, { headers: auth });
	expect(issuedFirst.status()).toBe(200);
	const firstNumber = ((await issuedFirst.json()) as { number: string }).number;
	await page.reload();
	await page.getByRole('button', { name: 'In Rechnung umwandeln' }).click();
	const secondDraft = await convertedDraftId(page);
	expect(secondDraft).not.toBe(firstDraft);
	const issuedSecond = await request.post(`/api/invoices/${secondDraft}/issue`, { headers: auth });
	expect(issuedSecond.status()).toBe(200);
	const secondNumber = ((await issuedSecond.json()) as { number: string }).number;

	// 3. the offer names both invoices, the invoice names the offer
	await page.reload();
	await expect(page.locator('#d-links')).toContainText('Daraus hervorgegangene Rechnung(en)');
	await expect(page.locator('#d-links')).toContainText(firstNumber);
	await expect(page.locator('#d-links')).toContainText(secondNumber);
	await page.goto(`/#/invoices/${secondDraft}`);
	await expect(page.locator('#view')).toContainText('Zugrunde liegendes Angebot');
	await expect(page.locator('#view')).toContainText(split.number);
});

test('shows an offer that ran out of time as "Verfallen"', async ({ page, request }) => {
	// issued five days ago, validity over: the offer is neither a draft nor open
	const offer = await createOffer(request, {
		buyer: { name: 'Zögert AG', street: 'Zögerweg 4', zip: '01067', city: 'Dresden', country: 'DE' },
		issueDate: day(-40),
		validUntil: day(-5),
	});
	await signIn(page);

	// 1. the state is its own filter in the offer list
	await page.goto('/#/offers');
	await page.locator('#o-state').selectOption('expired');
	await expect(page.locator('#o-list')).toContainText(offer.number);
	await expect(page.locator('#o-list')).toContainText('Verfallen');

	// 2. the detail page says why — and the customer may still say yes, because
	//    only a human decides whether an expired offer is still the basis
	await page.goto(`/#/invoices/${offer.id}`);
	await expect(page.locator('.badge.expired')).toHaveText('Verfallen');
	await expect(page.locator('#view')).toContainText('verfallen');
	await expect(page.getByRole('button', { name: 'Annehmen' })).toBeVisible();
});
