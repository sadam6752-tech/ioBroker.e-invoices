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
import { InvoiceDatabase } from '../src/lib/db';
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
