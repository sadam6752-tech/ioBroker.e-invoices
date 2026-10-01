/**
 * API tests for ioBroker.e-invoices (P4a).
 * Lives in test/ (excluded from the repo-checker source scan),
 * runs without js-controller via supertest + temp database.
 */
import { expect } from 'chai';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { attachStatic, createApiServer } from '../src/lib/api-server';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from '../src/lib/attachments';
import { InvoiceDatabase } from '../src/lib/db';
import { defaultValidUntil } from '../src/lib/invoice-model';
import { DEFAULT_TEMPLATE } from '../src/lib/templates';

const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
	email: 'rechnung@muster.example',
};

const buyer = {
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
};

const draftBody = {
	seller,
	buyer,
	lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
	issueDate: '2026-09-28',
	deliveryDate: '2026-09-27',
	dueDate: '2026-10-12',
	currency: 'EUR',
	documentTitle: 'Rechnung',
};

describe('api => invoices', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		const store = {
			write: (path: string, data: string | Buffer): Promise<void> => {
				files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
				return Promise.resolve();
			},
			read: (path: string): Promise<Buffer> => {
				const found = files.get(path);
				if (!found) {
					return Promise.reject(new Error(`missing: ${path}`));
				}
				return Promise.resolve(found);
			},
		};
		const quiet = { info: (): void => undefined, error: (): void => undefined };
		app = createApiServer({ db, storage: store, log: quiet, version: '0.0.0-test' });
	});

	after(() => {
		db.close();
	});

	it('health reports ok with counts', async () => {
		const res = await request(app).get('/api/health').expect(200);
		expect(res.body.status).to.equal('ok');
		expect(res.body.counts.draft).to.equal(0);
	});

	it('sends a same-origin CSP that keeps plain-HTTP LAN access working', async () => {
		const res = await request(app).get('/api/health').expect(200);
		const csp = String(res.headers['content-security-policy'] ?? '');
		expect(csp).to.contain("default-src 'self'");
		expect(csp).to.contain("script-src 'self'");
		expect(csp).to.contain("frame-ancestors 'none'");
		// helmet's default directives include `upgrade-insecure-requests`. On a
		// plain-HTTP LAN origin (http://192.168.x.y:8093) the browser then
		// rewrites every asset URL to https://, fails with a CORS error and
		// leaves the start page blank. Only localhost is exempt as "trustworthy".
		expect(csp).to.not.contain('upgrade-insecure-requests');
	});

	it('rejects drafts without parties/lines', async () => {
		await request(app).post('/api/invoices').send({ seller }).expect(400);
	});

	it('runs the full draft -> validate -> issue -> download flow', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const id = created.body.id as string;
		expect(created.body.status).to.equal('draft');

		await request(app).get(`/api/invoices/${id}`).expect(200);
		await request(app).get('/api/invoices/does-not-exist').expect(404);

		const patched = await request(app).patch(`/api/invoices/${id}`).send({ dueDate: '2026-11-01' }).expect(200);
		expect(patched.body.dueDate).to.equal('2026-11-01');

		const valid = await request(app).post(`/api/invoices/${id}/validate`).expect(200);
		expect(valid.body.businessErrors).to.deep.equal([]);
		expect(valid.body.formatErrors).to.deep.equal([]);
		// R2: the run is stored as a JSON report next to the artifacts
		expect(valid.body.report.seq).to.equal(1);
		expect(valid.body.report.path).to.match(/^invoices\/2026\/.+\.validation-1\.json$/);

		const issued = await request(app).post(`/api/invoices/${id}/issue`).expect(200);
		expect(issued.body.number).to.match(/^2026-00-\d{3}$/);

		const xml = await request(app).get(`/api/invoices/${id}.xml`).expect(200);
		expect(xml.headers['content-type']).to.contain('application/xml');
		expect(xml.text).to.contain('CrossIndustryInvoice');

		const pdf = await request(app).get(`/api/invoices/${id}.pdf`).expect(200);
		expect(pdf.headers['content-type']).to.contain('application/pdf');

		const xlsx = await request(app).get(`/api/invoices/${id}.xlsx`).expect(200);
		expect(xlsx.headers['content-type']).to.contain('spreadsheetml.sheet');

		const list = await request(app).get('/api/invoices/export.xlsx').query({ status: 'issued' }).expect(200);
		expect(list.headers['content-type']).to.contain('spreadsheetml.sheet');

		// R2: stored validation reports are listable and downloadable
		const reports = await request(app).get(`/api/invoices/${id}/validation`).expect(200);
		expect(reports.body).to.have.lengthOf(1);
		expect(reports.body[0].seq).to.equal(1);
		expect(reports.body[0].formatErrors).to.equal(0);
		const storedReport = await request(app).get(`/api/invoices/${id}/validation/1.json`).expect(200);
		expect(storedReport.headers['content-type']).to.contain('application/json');
		const parsed = JSON.parse(storedReport.text) as {
			ok: boolean;
			invoiceNumber: string | null;
			businessErrors: string[];
			formatErrors: string[];
		};
		expect(parsed.ok).to.equal(true);
		expect(parsed.formatErrors).to.deep.equal([]);
		expect(parsed.businessErrors).to.deep.equal([]);
		// reported before the invoice was issued, so it had no number yet
		expect(parsed.invoiceNumber).to.equal(null);
		await request(app).get(`/api/invoices/${id}/validation/7.json`).expect(404);
		await request(app).get('/api/invoices/does-not-exist/validation').expect(404);

		// issued invoices are immutable
		await request(app).patch(`/api/invoices/${id}`).send({ dueDate: '2026-12-01' }).expect(400);
		await request(app).post(`/api/invoices/${id}/issue`).expect(400);
	});

	it('re-renders an issued invoice and keeps the original', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);

		const res = await request(app)
			.post(`/api/invoices/${created.body.id}/rerender`)
			.send({ reason: 'Layoutkorrektur' })
			.expect(200);
		expect(res.body.invoice.status).to.equal('issued');
		expect(res.body.invoice.number).to.match(/^2026-00-\d{3}$/);
		// the original stays retrievable next to the fresh rendering
		expect(res.body.archivedPath).to.match(/\.orig-1\.pdf$/);

		const history = await request(app).get(`/api/invoices/${created.body.id}/renders`).expect(200);
		expect(history.body).to.have.lengthOf(1);
		expect(history.body[0].reason).to.equal('Layoutkorrektur');
		expect(history.body[0].artifact).to.equal('pdf');
	});

	it('refuses to re-render a draft', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/rerender`).expect(400);
		await request(app).get('/api/invoices/gibt-es-nicht/renders').expect(404);
		// there is no DELETE for drafts, so mark it issued again to leave no draft
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
	});

	it('creates a template from an issued invoice', async () => {
		const created = await request(app)
			.post('/api/invoices')
			.send({ ...draftBody, paymentTerms: 'Zahlbar innerhalb von 14 Tagen' })
			.expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);

		const res = await request(app)
			.post(`/api/invoices/${created.body.id}/as-template`)
			.send({ name: 'Beratung jährlich' })
			.expect(201);
		expect(res.body.name).to.equal('Beratung jährlich');
		// content travels with the template
		expect(res.body.body.lines).to.have.lengthOf(1);
		expect(res.body.body.paymentTerms).to.be.a('string');

		// a missing name is refused
		await request(app).post(`/api/invoices/${created.body.id}/as-template`).send({}).expect(400);
		await request(app).post('/api/invoices/gibt-es-nicht/as-template').send({ name: 'X' }).expect(404);

		// clean up so the next test starts from an empty list
		await request(app).delete(`/api/invoice-templates/${res.body.id}`).expect(204);
	});

	it('manages invoice content templates', async () => {
		const body = {
			lines: [{ description: 'Wartung', quantity: 1, unit: 'Stk', unitPriceNet: 250, vatRate: 19 }],
			paymentTerms: 'Zahlbar innerhalb von 14 Tagen',
			skontoPercent: 2,
		};
		const created = await request(app)
			.post('/api/invoice-templates')
			.send({ name: 'Monatliche Wartung', body })
			.expect(201);
		expect(created.body.name).to.equal('Monatliche Wartung');

		const list = await request(app).get('/api/invoice-templates').expect(200);
		expect(list.body).to.have.lengthOf(1);

		// update keeps the id, so the wizard selection stays valid
		const updated = await request(app)
			.put(`/api/invoice-templates/${created.body.id}`)
			.send({ name: 'Wartung Jährlich', body: { ...body, skontoPercent: 0 } })
			.expect(200);
		expect(updated.body.id).to.equal(created.body.id);
		expect(updated.body.name).to.equal('Wartung Jährlich');

		await request(app).delete(`/api/invoice-templates/${created.body.id}`).expect(204);
		expect((await request(app).get('/api/invoice-templates').expect(200)).body).to.have.lengthOf(0);
	});

	it('rejects an invoice template without a name', async () => {
		await request(app).post('/api/invoice-templates').send({ name: '  ', body: {} }).expect(400);
		await request(app).post('/api/invoice-templates').send({ name: 'X' }).expect(400);
		await request(app).put('/api/invoice-templates/gibt-es-nicht').send({ name: 'X' }).expect(404);
	});

	it('serves the accounting exports instead of looking them up as an invoice', async () => {
		// Express matches /api/invoices/:id against dotted names too, so the
		// export routes must be registered first. Both used to answer 404
		// with "Invoice not found".
		const csv = await request(app).get('/api/invoices/export.csv').expect(200);
		expect(csv.headers['content-type']).to.contain('text/csv');
		expect(csv.headers['content-disposition']).to.contain('rechnungen.csv');
		expect(csv.text).to.contain('Rechnungsnummer');

		const datev = await request(app).get('/api/invoices/export.datev').expect(200);
		expect(datev.headers['content-disposition']).to.contain('rechnungen.datev');
		expect(datev.text).to.contain('EXTF');
	});

	it('marks every API response as non-cacheable', async () => {
		// A stored PDF keeps the layout of the moment it was rendered. Serving it
		// from a cache hid corrected renderings, so no answer may be reused.
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
		for (const url of ['/api/health', '/api/invoices', `/api/invoices/${created.body.id}.pdf`]) {
			const res = await request(app).get(url);
			expect(res.status, url).to.be.oneOf([200, 401, 404]);
			expect(res.headers['cache-control'], url).to.contain('no-store');
		}
	});

	it('lists and filters invoices', async () => {
		const all = await request(app).get('/api/invoices').expect(200);
		expect(all.body.length).to.be.greaterThan(0);
		const issued = await request(app).get('/api/invoices').query({ status: 'issued' }).expect(200);
		expect(issued.body.length).to.be.greaterThan(0);
		const drafts = await request(app).get('/api/invoices').query({ status: 'draft' }).expect(200);
		expect(drafts.body).to.deep.equal([]);
	});

	it('answers 404 for unknown api routes', async () => {
		await request(app).get('/api/nope').expect(404);
	});

	it('rejects a PATCH that would corrupt the invoice', async () => {
		const created = await request(app)
			.post('/api/invoices')
			.send({
				seller: { name: 'S', street: 'a', zip: '1', city: 'b', country: 'DE' },
				buyer: { name: 'B', street: 'c', zip: '2', city: 'd', country: 'DE', customerNumber: 'K-1' },
				lines: [{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
			})
			.expect(201);
		const id = created.body.id as string;

		await request(app).patch(`/api/invoices/${id}`).send({ lines: {} }).expect(400);
		await request(app)
			.patch(`/api/invoices/${id}`)
			.send({ seller: [1, 2] })
			.expect(400);

		const after = await request(app).get(`/api/invoices/${id}`).expect(200);
		expect(Array.isArray(after.body.lines)).to.equal(true);
		expect(after.body.totals.grossTotal).to.equal(11.9);
		await request(app).post(`/api/invoices/${id}/validate`).send({}).expect(200);
	});

	it('reports a malformed json body as 400, not 500', async () => {
		const response = await request(app)
			.post('/api/invoices')
			.set('Content-Type', 'application/json')
			.send('{ not json')
			.expect(400);
		expect(response.body.error).to.be.a('string');
	});

	it('marks invoices paid and creates a Storno credit note', async () => {
		const created = await request(app)
			.post('/api/invoices')
			.send({
				seller: { name: 'S', street: 'a', zip: '1', city: 'b', country: 'DE', vatId: 'DE1' },
				buyer: { name: 'B', street: 'c', zip: '2', city: 'd', country: 'DE', customerNumber: 'K-1' },
				lines: [{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
			})
			.expect(201);
		const issued = await request(app).post(`/api/invoices/${created.body.id}/issue`).send({}).expect(200);

		await request(app).post(`/api/invoices/${created.body.id}/paid`).send({ paid: 'yes' }).expect(400);
		const paid = await request(app)
			.post(`/api/invoices/${created.body.id}/paid`)
			.send({ paid: true, paidAt: '2026-10-01' })
			.expect(200);
		expect(paid.body.paid).to.equal(true);
		expect(paid.body.paidAt).to.equal('2026-10-01');

		const storno = await request(app)
			.post(`/api/invoices/${created.body.id}/storno`)
			.send({ reason: 'Falsch ausgestellt' })
			.expect(201);
		expect(storno.body.original.status).to.equal('cancelled');
		expect(storno.body.reversal.stornoOfId).to.equal(created.body.id);
		expect(storno.body.reversal.documentTitle).to.equal('Gutschrift');
		// the original keeps its number and is not deleted
		expect(storno.body.original.number).to.equal(issued.body.number);
		await request(app).post(`/api/invoices/${created.body.id}/storno`).send({}).expect(400);
	});

	it('falls back to the default page size for unparsable limit/offset', async () => {
		const response = await request(app).get('/api/invoices?limit=abc&offset=abc').expect(200);
		expect(response.body).to.be.an('array');
	});
});

describe('api => company profiles', () => {
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const quiet = { info: (): void => undefined, error: (): void => undefined };
		app = createApiServer({
			db,
			storage: {
				write: (): Promise<void> => Promise.resolve(),
				read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
			},
			log: quiet,
			version: '0.0.0-test',
		});
	});

	after(() => {
		db.close();
	});

	it('creates, reads, updates and switches the default', async () => {
		const empty = await request(app).get('/api/company-profiles').expect(200);
		expect(empty.body).to.deep.equal([]);
		expect(await request(app).get('/api/company-profiles/default').expect(200)).to.have.property('body');

		const created = await request(app)
			.post('/api/company-profiles')
			.send({ name: 'Firma', profile: { ...seller, vatId: 'DE1' } })
			.expect(201);
		expect(created.body.isDefault).to.equal(true);

		const updated = await request(app)
			.put(`/api/company-profiles/${created.body.id as string}`)
			.send({ profile: { ...seller, vatId: 'DE1', phone: '+49' } })
			.expect(200);
		expect(updated.body.profile.phone).to.equal('+49');

		const second = await request(app)
			.post('/api/company-profiles')
			.send({ name: 'Zweit', profile: seller })
			.expect(201);
		await request(app)
			.post(`/api/company-profiles/${second.body.id as string}/default`)
			.expect(200);
		const def = await request(app).get('/api/company-profiles/default').expect(200);
		expect(def.body.id).to.equal(second.body.id);

		await request(app)
			.delete(`/api/company-profiles/${created.body.id as string}`)
			.expect(200);
		await request(app)
			.delete(`/api/company-profiles/${second.body.id as string}`)
			.expect(400);
		await request(app).get('/api/company-profiles/nope').expect(404);
		await request(app).post('/api/company-profiles').send({ name: 'X' }).expect(400);
	});
});

describe('api => customers', () => {
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const quiet = { info: (): void => undefined, error: (): void => undefined };
		app = createApiServer({
			db,
			storage: {
				write: (): Promise<void> => Promise.resolve(),
				read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
			},
			log: quiet,
			version: '0.0.0-test',
		});
	});

	after(() => {
		db.close();
	});

	it('creates, reads, updates and deletes customers', async () => {
		const empty = await request(app).get('/api/customers').expect(200);
		expect(empty.body).to.deep.equal([]);

		const created = await request(app)
			.post('/api/customers')
			.send({ name: 'Kunde AG', profile: { ...buyer, customerNumber: 'K-7' } })
			.expect(201);
		const read = await request(app)
			.get(`/api/customers/${created.body.id as string}`)
			.expect(200);
		expect(read.body.profile.customerNumber).to.equal('K-7');

		const updated = await request(app)
			.put(`/api/customers/${created.body.id as string}`)
			.send({ name: 'Kunde GmbH' })
			.expect(200);
		expect(updated.body.name).to.equal('Kunde GmbH');

		await request(app)
			.delete(`/api/customers/${created.body.id as string}`)
			.expect(200);
		await request(app)
			.get(`/api/customers/${created.body.id as string}`)
			.expect(404);
		await request(app).post('/api/customers').send({ name: 'X' }).expect(400);
	});
});

describe('api => products', () => {
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const quiet = { info: (): void => undefined, error: (): void => undefined };
		app = createApiServer({
			db,
			storage: {
				write: (): Promise<void> => Promise.resolve(),
				read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
			},
			log: quiet,
			version: '0.0.0-test',
		});
	});

	after(() => {
		db.close();
	});

	it('creates, reads, updates and deletes products', async () => {
		const empty = await request(app).get('/api/products').expect(200);
		expect(empty.body).to.deep.equal([]);

		const created = await request(app)
			.post('/api/products')
			.send({ sku: 'ABC123', name: 'Produkt A', unit: 'Stk', unitPriceNet: 19.95, vatRate: 19 })
			.expect(201);
		const read = await request(app)
			.get(`/api/products/${created.body.id as string}`)
			.expect(200);
		expect(read.body.sku).to.equal('ABC123');

		const updated = await request(app)
			.put(`/api/products/${created.body.id as string}`)
			.send({ unitPriceNet: 21.5 })
			.expect(200);
		expect(updated.body.unitPriceNet).to.equal(21.5);

		await request(app)
			.delete(`/api/products/${created.body.id as string}`)
			.expect(200);
		await request(app)
			.get(`/api/products/${created.body.id as string}`)
			.expect(404);
		await request(app).post('/api/products').send({ name: '  ' }).expect(400);
		await request(app).post('/api/products').send({ name: 'X', vatRate: 16 }).expect(400);
	});
});

describe('api => auth', () => {
	let db: InvoiceDatabase;
	let openApp: ReturnType<typeof createApiServer>;
	let closedApp: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const quiet = { info: (): void => undefined, error: (): void => undefined };
		const stubStorage = {
			write: (): Promise<void> => Promise.resolve(),
			read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
		};
		openApp = createApiServer({ db, storage: stubStorage, log: quiet, version: 'x' });
		closedApp = createApiServer({ db, storage: stubStorage, log: quiet, version: 'x', authToken: 's3cret' });
	});

	after(() => {
		db.close();
	});

	it('leaves the API open without a token', async () => {
		await request(openApp).get('/api/invoices').expect(200);
	});

	it('keeps health open but locks everything else with a token', async () => {
		await request(closedApp).get('/api/health').expect(200);
		await request(closedApp).get('/api/invoices').expect(401);
		await request(closedApp).post('/api/invoices').send({}).expect(401);
		await request(closedApp).get('/api/invoices').set('Authorization', 'Bearer wrong').expect(401);
		await request(closedApp).get('/api/invoices').set('Authorization', 'Bearer s3cret').expect(200);
	});
});

describe('api => backup', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		app = createApiServer({
			db,
			storage: {
				write: (path: string, data: string | Buffer): Promise<void> => {
					files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
					return Promise.resolve();
				},
				read: (path: string): Promise<Buffer> => {
					const found = files.get(path);
					if (!found) {
						return Promise.reject(new Error(`missing: ${path}`));
					}
					return Promise.resolve(found);
				},
			},
			log: { info: (): void => undefined, error: (): void => undefined },
			version: '0.0.0-test',
		});
	});

	after(() => {
		db.close();
	});

	it('creates, lists, downloads and restores backups', async () => {
		const draft = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app)
			.post(`/api/invoices/${draft.body.id as string}/issue`)
			.expect(200);

		const created = await request(app).post('/api/backups').expect(201);
		expect(created.body.sha256).to.match(/^[0-9a-f]{64}$/);
		const filename = created.body.filename as string;

		const list = await request(app).get('/api/backups').expect(200);
		expect(list.body.length).to.be.greaterThan(0);

		const basename = String(filename).split('/').pop() ?? '';
		const download = await request(app).get(`/api/backups/file/${basename}`).expect(200);
		expect(download.headers['content-type']).to.contain('application/zip');

		const restored = await request(app).post('/api/restore').send({ filename: basename }).expect(200);
		expect(restored.body.invoices).to.be.greaterThan(0);
		expect(restored.body.fileErrors).to.deep.equal([]);

		await request(app).post('/api/restore').send({}).expect(400);
		await request(app).post('/api/restore').send({ filename: 'does-not-exist.zip' }).expect(404);
		await request(app).post('/api/restore').send({ dataBase64: 'bm90LXotemlw' }).expect(400);
	});
});

describe('api => templates', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		const files = new Map<string, Buffer>();
		app = createApiServer({
			db,
			storage: {
				write: (path: string, data: string | Buffer): Promise<void> => {
					files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
					return Promise.resolve();
				},
				read: (path: string): Promise<Buffer> => {
					const found = files.get(path);
					if (!found) {
						return Promise.reject(new Error(`missing: ${path}`));
					}
					return Promise.resolve(found);
				},
			},
			log: { info: (): void => undefined, error: (): void => undefined },
			version: '0.0.0-test',
		});
	});

	after(() => {
		db.close();
	});

	it('CRUD, Pflichtfeld-Wächter, Vorschau und Logo', async () => {
		const empty = await request(app).get('/api/templates').expect(200);
		expect(empty.body).to.deep.equal([]);

		const badDef = { ...DEFAULT_TEMPLATE, blocks: { ...DEFAULT_TEMPLATE.blocks, totals: false } };
		await request(app).post('/api/templates').send({ name: 'Bad', definition: badDef }).expect(400);

		const first = await request(app)
			.post('/api/templates')
			.send({ name: 'Standard', definition: { ...DEFAULT_TEMPLATE, name: 'Standard' } })
			.expect(201);
		expect(first.body.isDefault).to.equal(true);

		const renamed = await request(app)
			.put(`/api/templates/${first.body.id}`)
			.send({ name: 'Standard 2' })
			.expect(200);
		expect(renamed.body.version).to.equal(2);

		const preview = await request(app)
			.post('/api/templates/preview')
			.send({ definition: { ...DEFAULT_TEMPLATE, name: 'Vorschau' } })
			.expect(200);
		expect(preview.headers['content-type']).to.contain('application/pdf');
		await request(app).post('/api/templates/preview').send({ definition: badDef }).expect(400);

		const png = readFileSync('admin/e-invoices.png');
		const withLogo = await request(app)
			.post(`/api/templates/${first.body.id}/logo`)
			.send({ filename: 'logo.png', mime: 'image/png', dataBase64: png.toString('base64') })
			.expect(200);
		expect(withLogo.body.definition.logo.path).to.contain('logos/');
		await request(app)
			.post(`/api/templates/${first.body.id}/logo`)
			.send({ filename: 'logo.txt', mime: 'text/plain', dataBase64: 'aGk=' })
			.expect(400);

		const second = await request(app)
			.post('/api/templates')
			.send({ name: 'Zweit', definition: { ...DEFAULT_TEMPLATE, name: 'Zweit' } })
			.expect(201);
		const switched = await request(app).post(`/api/templates/${second.body.id}/default`).expect(200);
		expect(switched.body.isDefault).to.equal(true);

		await request(app).delete(`/api/templates/${first.body.id}`).expect(200);
		await request(app).delete(`/api/templates/${second.body.id}`).expect(400);
		await request(app).get('/api/templates/nope').expect(404);
	});
});

describe('api => security (R3)', () => {
	let db: InvoiceDatabase;
	const quiet = { info: (): void => undefined, error: (): void => undefined };
	const stubStorage = {
		write: (): Promise<void> => Promise.resolve(),
		read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
	};

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
	});

	after(() => {
		db.close();
	});

	it('sends a self-only CSP and the usual hardening headers', async () => {
		const app = createApiServer({ db, storage: stubStorage, log: quiet, version: 'x' });
		const res = await request(app).get('/api/health').expect(200);
		const csp = String(res.headers['content-security-policy']);
		expect(csp).to.contain("default-src 'self'");
		expect(csp).to.contain("connect-src 'self'");
		expect(csp).to.contain("object-src 'none'");
		expect(csp).to.contain("frame-ancestors 'none'");
		expect(res.headers['x-content-type-options']).to.equal('nosniff');
		expect(res.headers['x-frame-options']).to.equal('SAMEORIGIN');
		expect(res.headers['referrer-policy']).to.equal('no-referrer');
		expect(res.headers['x-powered-by']).to.equal(undefined);
	});

	it('answers 429 once the per-minute budget is used up', async () => {
		const app = createApiServer({
			db,
			storage: stubStorage,
			log: quiet,
			version: 'x',
			limits: { api: 3 },
		});
		for (let i = 0; i < 3; i++) {
			await request(app).get('/api/health').expect(200);
		}
		const blocked = await request(app).get('/api/health').expect(429);
		expect(blocked.body.error).to.equal('Too many requests');
	});

	it('gives the restore route a much smaller budget', async () => {
		const app = createApiServer({
			db,
			storage: stubStorage,
			log: quiet,
			version: 'x',
			limits: { api: 50, restore: 1 },
		});
		await request(app).post('/api/restore/preview').send({ filename: 'nothing.zip' }).expect(404);
		await request(app).post('/api/restore/preview').send({ filename: 'nothing.zip' }).expect(429);
	});
});

describe('api => static PWA bundle', function () {
	this.timeout(60000);
	let dir: string;
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;
	const quiet = { info: (): void => undefined, error: (): void => undefined };
	const stubStorage = {
		write: (): Promise<void> => Promise.resolve(),
		read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
	};

	before(() => {
		dir = mkdtempSync(join(tmpdir(), 'e-invoices-www-'));
		mkdirSync(join(dir, 'icons'), { recursive: true });
		writeFileSync(join(dir, 'index.html'), '<!doctype html><title>E-Invoices</title>');
		// the payload itself does not matter, only that an icon is shipped
		writeFileSync(join(dir, 'icons', 'icon-192.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		app = createApiServer({ db, storage: stubStorage, log: quiet, version: 'x' });
		expect(attachStatic(app, dir)).to.equal(true);
	});

	after(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it('serves the mounted bundle', async () => {
		const res = await request(app).get('/index.html').expect(200);
		expect(res.text).to.contain('E-Invoices');
	});

	it('answers the implicit /favicon.ico request with the PWA icon', async () => {
		// Regression 30.09.2026: the start page loaded, but the browser console
		// on the real machine logged "GET /favicon.ico 404" on every visit.
		const res = await request(app).get('/favicon.ico').expect(200);
		expect(String(res.headers['content-type'])).to.contain('image/png');
	});

	it('keeps a missing icon a 404 instead of failing', async () => {
		const bare = mkdtempSync(join(tmpdir(), 'e-invoices-www-bare-'));
		try {
			const bareApp = createApiServer({ db, storage: stubStorage, log: quiet, version: 'x' });
			expect(attachStatic(bareApp, bare)).to.equal(true);
			await request(bareApp).get('/favicon.ico').expect(404);
		} finally {
			rmSync(bare, { recursive: true, force: true });
		}
	});
});

describe('api => attachments (R4)', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;
	const quiet = { info: (): void => undefined, error: (): void => undefined };
	/** Minimal PNG: signature plus IHDR marker. */
	const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49]);
	const sendPng = (filename = 'anlage.png', mime = 'image/png'): Record<string, string> => ({
		filename,
		mime,
		dataBase64: png.toString('base64'),
	});

	before(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		app = createApiServer({
			db,
			storage: {
				write: (): Promise<void> => Promise.resolve(),
				read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
			},
			log: quiet,
			version: '0.0.0-test',
		});
	});

	after(() => {
		db.close();
	});

	it('runs upload -> list -> download -> delete on a draft', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const id = created.body.id as string;
		expect((await request(app).get(`/api/invoices/${id}/attachments`).expect(200)).body).to.deep.equal([]);

		const uploaded = await request(app)
			.post(`/api/invoices/${id}/attachments`)
			.send(sendPng('Lieferschein Müller.png'))
			.expect(201);
		expect(uploaded.body.filename).to.equal('Lieferschein Müller.png');
		expect(uploaded.body.mime).to.equal('image/png');
		expect(uploaded.body.size).to.equal(png.length);

		const list = await request(app).get(`/api/invoices/${id}/attachments`).expect(200);
		expect(list.body).to.have.lengthOf(1);
		expect(list.body[0].id).to.equal(uploaded.body.id);
		// the list must not drag the BLOB into the response
		expect(list.body[0].data).to.equal(undefined);

		const download = await request(app).get(`/api/invoices/${id}/attachments/${uploaded.body.id}`).expect(200);
		expect(String(download.headers['content-type'])).to.contain('image/png');
		expect(String(download.headers['content-disposition'])).to.contain('filename*=UTF-8');
		expect(Buffer.compare(download.body, png)).to.equal(0);

		await request(app).delete(`/api/invoices/${id}/attachments/${uploaded.body.id}`).expect(204);
		await request(app).get(`/api/invoices/${id}/attachments/${uploaded.body.id}`).expect(404);
		expect((await request(app).get(`/api/invoices/${id}/attachments`).expect(200)).body).to.deep.equal([]);
	});

	it('rejects unknown invoices, bad ids and incomplete bodies', async () => {
		await request(app).get('/api/invoices/does-not-exist/attachments').expect(404);
		await request(app).post('/api/invoices/does-not-exist/attachments').send(sendPng()).expect(404);
		await request(app).delete('/api/invoices/does-not-exist/attachments/1').expect(404);

		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const id = created.body.id as string;
		await request(app).post(`/api/invoices/${id}/attachments`).send({ filename: 'a.png' }).expect(400);
		await request(app).get(`/api/invoices/${id}/attachments/abc`).expect(400);
		await request(app).delete(`/api/invoices/${id}/attachments/abc`).expect(400);
		await request(app).get(`/api/invoices/${id}/attachments/7`).expect(404);
	});

	it('trusts the content, not the extension or the declared type', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const id = created.body.id as string;
		const zipBase64 = Buffer.from([0x50, 0x4b, 0x03, 0x04]).toString('base64');

		await request(app)
			.post(`/api/invoices/${id}/attachments`)
			.send({ filename: 'beleg.pdf', mime: 'application/pdf', dataBase64: zipBase64 })
			.expect(400);
		await request(app)
			.post(`/api/invoices/${id}/attachments`)
			.send({ filename: 'beleg.txt', mime: 'text/plain', dataBase64: Buffer.from('Text').toString('base64') })
			.expect(400);
		const mismatch = await request(app)
			.post(`/api/invoices/${id}/attachments`)
			.send(sendPng('beleg.png', 'application/pdf'))
			.expect(400);
		expect(String(mismatch.body.error)).to.match(/declared type/i);
		const tooBig = await request(app)
			.post(`/api/invoices/${id}/attachments`)
			.send({
				filename: 'gross.png',
				dataBase64: Buffer.concat([png, Buffer.alloc(ATTACHMENT_MAX_BYTES)]).toString('base64'),
			})
			.expect(400);
		expect(String(tooBig.body.error)).to.match(/5 MB/);
		expect((await request(app).get(`/api/invoices/${id}/attachments`).expect(200)).body).to.deep.equal([]);
	});

	it('limits the count and freezes the attachments with the issued invoice', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const id = created.body.id as string;
		for (let i = 0; i < ATTACHMENT_MAX_COUNT; i++) {
			await request(app)
				.post(`/api/invoices/${id}/attachments`)
				.send(sendPng(`anlage-${i}.png`))
				.expect(201);
		}
		const full = await request(app).post(`/api/invoices/${id}/attachments`).send(sendPng()).expect(400);
		expect(String(full.body.error)).to.match(/At most 10/);

		db.issueDraft(id);
		const frozen = await request(app).post(`/api/invoices/${id}/attachments`).send(sendPng()).expect(400);
		expect(String(frozen.body.error)).to.match(/draft/i);
		// reading stays possible: the issued PDF/XML name these files
		const list = await request(app).get(`/api/invoices/${id}/attachments`).expect(200);
		expect(list.body).to.have.lengthOf(10);
		await request(app).delete(`/api/invoices/${id}/attachments/${list.body[0].id}`).expect(400);
		await request(app).get(`/api/invoices/${id}/attachments/${list.body[0].id}`).expect(200);
	});
});

describe('api => quotations (R8)', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;
	let files: Map<string, Buffer>;
	const quiet = { info: (): void => undefined, error: (): void => undefined };
	const quoteBody = {
		seller,
		buyer,
		lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		currency: 'EUR',
		docType: 'quote',
	};

	beforeEach(() => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		files = new Map<string, Buffer>();
		app = createApiServer({
			db,
			storage: {
				write: (path: string, data: string | Buffer): Promise<void> => {
					files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
					return Promise.resolve();
				},
				read: (path: string): Promise<Buffer> => {
					const found = files.get(path);
					return found ? Promise.resolve(found) : Promise.reject(new Error(`missing: ${path}`));
				},
			},
			log: quiet,
			version: '0.0.0-test',
		});
	});

	afterEach(() => {
		db.close();
	});

	/**
	 * Creates a quotation draft through the API and returns its id.
	 *
	 * @param overrides - Fields that replace the defaults of the quoted body.
	 */
	async function createQuote(overrides: Record<string, unknown> = {}): Promise<string> {
		const created = await request(app)
			.post('/api/invoices')
			.send({ ...quoteBody, ...overrides })
			.expect(201);
		return created.body.id as string;
	}

	it('starts a quotation draft with its own title and validity', async () => {
		const id = await createQuote({ docType: 'QUOTE' });
		const stored = await request(app).get(`/api/invoices/${id}`).expect(200);
		expect(stored.body.docType).to.equal('quote');
		expect(stored.body.documentTitle).to.equal('Angebot');
		expect(stored.body.status).to.equal('draft');
		expect(stored.body.number).to.equal(null);
		// filled with 30 days, so "Gültig bis" is never empty while the wizard runs
		const today = new Date().toISOString().slice(0, 10);
		expect(stored.body.validUntil).to.equal(defaultValidUntil(today));

		// an explicit date from the request wins over that default
		const explicit = await createQuote({ validUntil: '2026-11-15' });
		expect((await request(app).get(`/api/invoices/${explicit}`).expect(200)).body.validUntil).to.equal(
			'2026-11-15',
		);

		// the invoice keeps its own defaults
		const invoice = await request(app).post('/api/invoices').send(draftBody).expect(201);
		expect(invoice.body.docType).to.equal('invoice');
		expect(invoice.body.documentTitle).to.equal('Rechnung');
		expect(invoice.body.validUntil).to.equal(null);
	});

	it('issues a quotation as a plain sight PDF without e-invoice XML', async () => {
		const id = await createQuote({ validUntil: '2026-10-28' });
		const issued = await request(app).post(`/api/invoices/${id}/issue`).expect(200);
		expect(issued.body.docType).to.equal('quote');
		expect(issued.body.number).to.match(/^A-2026-00-\d{3}$/);
		expect(issued.body.validUntil).to.equal('2026-10-28');
		// R8: no CII XML, so no PDF/A-3 container and no BG-24 either
		expect(issued.body.xml).to.equal(null);
		expect([...files.keys()].filter(path => path.endsWith('.xml'))).to.deep.equal([]);
		expect(issued.body.pdfPath).to.match(/\.pdf$/);
		expect(files.has(issued.body.pdfPath as string)).to.equal(true);
		expect((await request(app).get(`/api/invoices/${id}.xml`).expect(404)).body.error).to.contain('No XML');

		const pdf = await request(app).get(`/api/invoices/${id}.pdf`).expect(200);
		expect(pdf.body.subarray(0, 4).toString()).to.equal('%PDF');
		expect(pdf.body.toString('latin1')).to.not.contain('pdfaid');

		// the hybrid file (PDF/A-3 + Factur-X) stays an invoice thing
		const invoice = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const hybrid = await request(app).post(`/api/invoices/${invoice.body.id}/issue`).expect(200);
		expect(hybrid.body.xml).to.contain('CrossIndustryInvoice');
		const hybridPdf = await request(app).get(`/api/invoices/${invoice.body.id}.pdf`).expect(200);
		expect(hybridPdf.body.toString('latin1')).to.contain('pdfaid');
	});

	it('keeps quotation and invoice numbers in separate circles', async () => {
		const quoteId = await createQuote();
		const invoice = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const issuedQuote = await request(app).post(`/api/invoices/${quoteId}/issue`).expect(200);
		const issuedInvoice = await request(app).post(`/api/invoices/${invoice.body.id}/issue`).expect(200);
		expect(issuedQuote.body.number).to.equal('A-2026-00-001');
		expect(issuedInvoice.body.number).to.equal('2026-00-001');

		// the list filters by document type, so offers and bookings stay apart
		const all = await request(app).get('/api/invoices').expect(200);
		expect(all.body.map((entry: { id: string }) => entry.id)).to.include(quoteId);
		const quotes = await request(app).get('/api/invoices?docType=quote').expect(200);
		expect(quotes.body.map((entry: { id: string }) => entry.id)).to.deep.equal([quoteId]);
		const invoices = await request(app).get('/api/invoices?docType=invoice').expect(200);
		expect(invoices.body.map((entry: { id: string }) => entry.id)).to.not.include(quoteId);
	});

	it('records the single customer decision on an issued quotation', async () => {
		const id = await createQuote();
		// a draft has not been handed out yet, so there is nothing to decide
		expect((await request(app).post(`/api/invoices/${id}/quote-accept`).expect(400)).body.error).to.contain(
			'before recording a decision',
		);
		await request(app).post(`/api/invoices/${id}/quote-accept`).send({ at: 42 }).expect(400);

		const issued = await request(app).post(`/api/invoices/${id}/issue`).expect(200);
		expect(issued.body.acceptedAt).to.equal(null);
		expect(issued.body.rejectedAt).to.equal(null);

		const accepted = await request(app)
			.post(`/api/invoices/${id}/quote-accept`)
			.send({ at: '2026-10-02T09:00:00.000Z' })
			.expect(200);
		expect(accepted.body.acceptedAt).to.equal('2026-10-02T09:00:00.000Z');
		expect(accepted.body.rejectedAt).to.equal(null);
		expect(accepted.body.rejectionReason).to.equal(null);

		// the first answer wins: a later "Nein" never overwrites the "Ja"
		const second = await request(app)
			.post(`/api/invoices/${id}/quote-reject`)
			.send({ reason: 'doch nicht' })
			.expect(400);
		expect(String(second.body.error)).to.contain('already recorded');
		const still = await request(app).get(`/api/invoices/${id}`).expect(200);
		expect(still.body.acceptedAt).to.equal('2026-10-02T09:00:00.000Z');
		expect(still.body.rejectionReason).to.equal(null);

		// an invoice has no customer decision, unknown ids are missing
		const invoice = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app).post(`/api/invoices/${invoice.body.id}/issue`).expect(200);
		expect(
			(await request(app).post(`/api/invoices/${invoice.body.id}/quote-accept`).expect(400)).body.error,
		).to.contain('Only a quotation');
		await request(app).post('/api/invoices/gibt-es-nicht/quote-reject').expect(404);
	});

	it('rejects a quotation with reason and refuses undeclared request bodies', async () => {
		const id = await createQuote();
		await request(app).post(`/api/invoices/${id}/issue`).expect(200);

		await request(app).post(`/api/invoices/${id}/quote-reject`).send({ reason: 42 }).expect(400);
		await request(app).post(`/api/invoices/${id}/quote-reject`).send({ at: 42 }).expect(400);
		const rejected = await request(app)
			.post(`/api/invoices/${id}/quote-reject`)
			.send({ reason: 'zu teuer', at: '2026-10-03T08:30:00.000Z' })
			.expect(200);
		expect(rejected.body.rejectedAt).to.equal('2026-10-03T08:30:00.000Z');
		expect(rejected.body.rejectionReason).to.equal('zu teuer');
		expect(rejected.body.acceptedAt).to.equal(null);

		// without a reason the timestamp alone still documents the "Nein"
		const other = await createQuote();
		await request(app).post(`/api/invoices/${other}/issue`).expect(200);
		const plain = await request(app).post(`/api/invoices/${other}/quote-reject`).send({}).expect(200);
		expect(plain.body.rejectedAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
		expect(plain.body.rejectionReason).to.equal(null);
	});

	it('converts a quotation into an invoice draft and leaves the offer frozen', async () => {
		const id = await createQuote({ validUntil: '2026-10-28' });
		await request(app).post(`/api/invoices/${id}/issue`).expect(200);

		// the recorded "Ja" is the paper trail, so it is required by default
		await request(app).post(`/api/invoices/${id}/convert`).send({}).expect(400);
		await request(app).post(`/api/invoices/${id}/convert`).send({ requireAccepted: 'yes' }).expect(400);
		const refused = await request(app)
			.post(`/api/invoices/${id}/convert`)
			.send({ requireAccepted: true })
			.expect(400);
		expect(String(refused.body.error)).to.contain('has not accepted');

		const converted = await request(app)
			.post(`/api/invoices/${id}/convert`)
			.send({ requireAccepted: false, dueDate: '2026-11-12' })
			.expect(201);
		expect(converted.body.docType).to.equal('invoice');
		expect(converted.body.documentTitle).to.equal('Rechnung');
		expect(converted.body.sourceDocumentId).to.equal(id);
		expect(converted.body.status).to.equal('draft');
		expect(converted.body.number).to.equal(null);
		expect(converted.body.dueDate).to.equal('2026-11-12');
		expect(converted.body.validUntil).to.equal(null);
		// lines and parties travel over unchanged
		expect(converted.body.lines).to.deep.equal(quoteBody.lines);
		expect(converted.body.buyer).to.deep.equal(buyer);

		// only one open draft per quotation
		const again = await request(app)
			.post(`/api/invoices/${id}/convert`)
			.send({ requireAccepted: false })
			.expect(400);
		expect(String(again.body.error)).to.contain('already exists');

		// issuing the draft numbers it from the invoice circle; the offer stays put
		const issued = await request(app).post(`/api/invoices/${converted.body.id}/issue`).expect(200);
		expect(issued.body.number).to.match(/^\d{4}-00-001$/);
		const quote = await request(app).get(`/api/invoices/${id}`).expect(200);
		expect(quote.body.docType).to.equal('quote');
		expect(quote.body.number).to.equal('A-2026-00-001');
		expect(quote.body.status).to.equal('issued');
		expect(quote.body.validUntil).to.equal('2026-10-28');
		// once that invoice is out, the next conversion follows (partial/final)
		await request(app).post(`/api/invoices/${id}/convert`).send({ requireAccepted: false }).expect(201);

		// an accepted quotation needs no opt-out
		const secondQuote = await createQuote();
		await request(app).post(`/api/invoices/${secondQuote}/issue`).expect(200);
		await request(app).post(`/api/invoices/${secondQuote}/quote-accept`).send({}).expect(200);
		const fromAccepted = await request(app).post(`/api/invoices/${secondQuote}/convert`).send({}).expect(201);
		expect(fromAccepted.body.docType).to.equal('invoice');
		expect(fromAccepted.body.sourceDocumentId).to.equal(secondQuote);

		// only a quotation can be converted
		const invoice = await request(app).post('/api/invoices').send(draftBody).expect(201);
		expect((await request(app).post(`/api/invoices/${invoice.body.id}/convert`).expect(400)).body.error).to.contain(
			'Only a quotation',
		);
		await request(app).post('/api/invoices/gibt-es-nicht/convert').expect(404);
	});

	it('validates a quotation without an e-invoice check and exports it apart', async () => {
		const id = await createQuote();
		const validation = await request(app).post(`/api/invoices/${id}/validate`).expect(200);
		// R8: a quotation is not an e-invoice, so no XSD findings may appear
		expect(validation.body.formatErrors).to.deep.equal([]);
		expect(validation.body.businessErrors).to.deep.equal([]);
		const report = validation.body.report as { seq: number; path: string };
		expect(report.seq).to.equal(1);
		expect(report.path).to.contain('validation-1.json');
		const stored = files.get(report.path);
		expect(stored).to.not.equal(undefined);
		const payload = JSON.parse(String(stored)) as { ok: boolean; documentTitle: string; validator: string };
		expect(payload.ok).to.equal(true);
		expect(payload.documentTitle).to.equal('Angebot');
		expect(payload.validator).to.contain('internal check');

		// an incomplete quotation reports a Pflichtangabe, still no format error
		const broken = await createQuote({ lines: [] });
		const brokenResult = await request(app).post(`/api/invoices/${broken}/validate`).expect(200);
		expect(brokenResult.body.businessErrors).to.not.deep.equal([]);
		expect(brokenResult.body.formatErrors).to.deep.equal([]);

		// an offer that expired before its own issue date is not handed out
		await request(app).post(`/api/invoices/${id}/issue`).expect(200);
		const expired = await createQuote({ validUntil: '2026-09-27' });
		const refused = await request(app).post(`/api/invoices/${expired}/issue`).expect(400);
		expect(String(refused.body.error)).to.contain('Valid-until date');

		// the accounting exports separate the two document types
		const csv = await request(app).get('/api/invoices/export.csv').expect(200);
		expect(csv.text).to.contain('A-2026-00-001');
		expect(csv.text).to.contain('Angebot');
		const onlyInvoices = await request(app).get('/api/invoices/export.csv?docType=invoice').expect(200);
		expect(onlyInvoices.text).to.not.contain('A-2026-00-001');
		const onlyQuotes = await request(app).get('/api/invoices/export.csv?docType=quote').expect(200);
		expect(onlyQuotes.text).to.contain('A-2026-00-001');
		const datevInvoices = await request(app).get('/api/invoices/export.datev?docType=invoice').expect(200);
		expect(datevInvoices.text).to.contain('EXTF');
		expect(datevInvoices.text).to.not.contain('A-2026-00-001');
		const datevQuotes = await request(app).get('/api/invoices/export.datev?docType=quote').expect(200);
		expect(datevQuotes.text).to.contain('A-2026-00-001');
	});
});
