/**
 * The backup chain of the instance, end to end (R5).
 *
 * `test/api-server.test.ts` covers the same endpoints on an in-memory database; this
 * suite runs against the **file** database and the artifact directory the end-to-end
 * server uses, so a restore really swaps the database and rewrites the files — the
 * step that once lost data on the dev-server (29.09.2026) and got a counter-merge fix
 * out of it. The counts are read before and after and compared as deltas: the whole
 * suite shares one server, so absolute numbers would depend on the order of the specs.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

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
};

const buyer = {
	name: 'Sicherung AG',
	street: 'Archivweg 3',
	zip: '20095',
	city: 'Hamburg',
	country: 'DE',
	customerNumber: 'K-77',
};

/** The counters of the running instance. */
interface Counts {
	draft: number;
	issued: number;
	cancelled: number;
}

/**
 * Reads the health endpoint and returns its counters.
 *
 * @param request - Playwright API client bound to the test server
 */
async function counts(request: APIRequestContext): Promise<Counts> {
	const health = await request.get('/api/health');
	expect(health.status()).toBe(200);
	return ((await health.json()) as { counts: Counts }).counts;
}

/**
 * Sums up all invoices the instance holds.
 *
 * @param value - counters as `/api/health` reports them
 */
function total(value: Counts): number {
	return value.draft + value.issued + value.cancelled;
}

/**
 * Creates a draft and issues it, so there is something the backup has to carry.
 *
 * @param request - Playwright API client bound to the test server
 */
async function issueInvoice(request: APIRequestContext): Promise<{ id: string; number: string }> {
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller,
			buyer,
			lines: [{ description: 'Sicherungslauf', quantity: 1, unit: 'Std', unitPriceNet: 120, vatRate: 19 }],
			issueDate: '2026-09-28',
		},
	});
	expect(created.status()).toBe(201);
	const id = ((await created.json()) as { id: string }).id;
	const issued = await request.post(`/api/invoices/${id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);
	return { id, number: ((await issued.json()) as { number: string }).number };
}

test('backs up, previews and restores the instance including its files', async ({ request }) => {
	const before = await counts(request);

	// 1. a state worth backing up
	const invoice = await issueInvoice(request);

	// 2. the backup is created, checksummed, listed and downloadable
	const created = await request.post('/api/backups', { headers: auth });
	expect(created.status()).toBe(201);
	const backup = (await created.json()) as { filename: string; sha256: string; size: number };
	expect(backup.filename).toMatch(/^backups\/.*\.zip$/);
	expect(backup.sha256).toMatch(/^[0-9a-f]{64}$/);
	expect(backup.size).toBeGreaterThan(1_000);
	// the download route takes the file name, the list keeps the storage-relative path
	const basename = backup.filename.split('/').pop() ?? '';

	const list = await request.get('/api/backups', { headers: auth });
	expect(list.status()).toBe(200);
	const names = ((await list.json()) as { filename: string }[]).map(entry => entry.filename);
	expect(names).toContain(backup.filename);

	const download = await request.get(`/api/backups/file/${basename}`, { headers: auth });
	expect(download.status()).toBe(200);
	expect(download.headers()['content-type']).toContain('application/zip');
	const zip = await download.body();
	expect(zip.subarray(0, 2).toString('latin1')).toBe('PK');

	// 3. the instance moves on after the backup: one more draft
	const extra = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller,
			buyer,
			lines: [
				{
					description: 'Nach der Sicherung entstanden',
					quantity: 1,
					unit: 'Std',
					unitPriceNet: 5,
					vatRate: 19,
				},
			],
			issueDate: '2026-09-29',
		},
	});
	expect(extra.status()).toBe(201);
	expect(total(await counts(request))).toBe(total(before) + 2);

	// 4. the preview announces what the restore would do — and writes nothing
	const preview = await request.post('/api/restore/preview', { headers: auth, data: { filename: basename } });
	expect(preview.status()).toBe(200);
	const announcement = (await preview.json()) as { invoices: number; currentInvoices: number };
	expect(announcement.invoices).toBe(total(before) + 1);
	expect(announcement.currentInvoices).toBe(total(before) + 2);
	expect(total(await counts(request))).toBe(total(before) + 2);

	// 5. the restore puts the backed up state back: the draft from step 3 is gone again
	const restored = await request.post('/api/restore', { headers: auth, data: { filename: basename } });
	expect(restored.status()).toBe(200);
	const summary = (await restored.json()) as { invoices: number; fileErrors: string[] };
	expect(summary.invoices).toBe(total(before) + 1);
	expect(summary.fileErrors).toEqual([]);

	const after = await counts(request);
	expect(total(after)).toBe(total(before) + 1);
	expect(after.draft).toBe(before.draft);

	// 6. the artifacts came back with the database: the invoice of step 1 is readable again
	const pdf = await request.get(`/api/invoices/${invoice.id}.pdf`, { headers: auth });
	expect(pdf.status()).toBe(200);
	expect(pdf.headers()['content-type']).toContain('application/pdf');
	const xml = await request.get(`/api/invoices/${invoice.id}.xml`, { headers: auth });
	expect(xml.status()).toBe(200);
	expect(await xml.text()).toContain(`<ram:ID>${invoice.number}</ram:ID>`);

	// 7. a broken request is refused instead of being half applied
	await request.post('/api/restore', { headers: auth, data: {} }).then(r => expect(r.status()).toBe(400));
	await request
		.post('/api/restore', { headers: auth, data: { filename: 'does-not-exist.zip' } })
		.then(r => expect(r.status()).toBe(404));
	await request
		.post('/api/restore', { headers: auth, data: { dataBase64: 'bm90LXotemlw' } })
		.then(r => expect(r.status()).toBe(400));
	expect(total(await counts(request))).toBe(total(before) + 1);
});
