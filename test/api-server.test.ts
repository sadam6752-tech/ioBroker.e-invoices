/**
 * API tests for ioBroker.e-invoices (P4a).
 * Lives in test/ (excluded from the repo-checker source scan),
 * runs without js-controller via supertest + temp database.
 */
import { expect } from 'chai';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
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
		// R7.8: without a choice the current layout is used
		expect(res.body.layout).to.equal('current');

		const history = await request(app).get(`/api/invoices/${created.body.id}/renders`).expect(200);
		expect(history.body).to.have.lengthOf(1);
		expect(history.body[0].reason).to.equal('Layoutkorrektur');
		expect(history.body[0].artifact).to.equal('pdf');
	});

	it('re-renders with the issued layout and validates the layout choice (R7.8)', async () => {
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		const issued = await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
		expect(issued.body.templateSnapshot.definition).to.be.an('object');

		const same = await request(app)
			.post(`/api/invoices/${created.body.id}/rerender`)
			.send({ reason: 'wie ausgestellt', layout: 'issued' })
			.expect(200);
		expect(same.body.layout).to.equal('issued');
		const history = await request(app).get(`/api/invoices/${created.body.id}/renders`).expect(200);
		expect(history.body[0].layout).to.equal('issued');

		await request(app).post(`/api/invoices/${created.body.id}/rerender`).send({ layout: 'bogus' }).expect(400);
	});

	it('binds documents to a company, filters by it and reports the revenue per company (R6.3)', async () => {
		const company = await request(app)
			.post('/api/company-profiles')
			.send({ name: 'Bericht GmbH', profile: { ...seller, name: 'Bericht GmbH' } })
			.expect(201);
		const companyId = company.body.id as string;
		await request(app)
			.post('/api/invoices')
			.send({ ...draftBody, companyId: 'gibt-es-nicht' })
			.expect(400);
		for (const net of [100, 40]) {
			const created = await request(app)
				.post('/api/invoices')
				.send({
					...draftBody,
					companyId,
					lines: [{ description: 'x', quantity: 1, unit: 'Stk', unitPriceNet: net, vatRate: 19 }],
				})
				.expect(201);
			expect(created.body.companyId).to.equal(companyId);
			await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
		}
		const listed = await request(app).get(`/api/invoices?companyId=${companyId}`).expect(200);
		expect(listed.body).to.have.lengthOf(2);
		const exported = await request(app).get(`/api/invoices/export.csv?companyId=${companyId}`).expect(200);
		expect(exported.text.split(/\r?\n/).filter(line => line.includes('Kunde AG'))).to.have.lengthOf(2);

		const report = (await request(app).get('/api/reports/revenue-by-company?year=2026').expect(200)).body;
		const row = report.rows.find((r: { companyId: string | null }) => r.companyId === companyId);
		expect(row).to.include({ company: 'Bericht GmbH', count: 2, net: 140, tax: 26.6, gross: 166.6 });
		const sum = report.rows.reduce((total: number, r: { gross: number }) => total + r.gross, 0);
		expect(Math.round(sum * 100) / 100).to.equal(report.total.gross);

		const csv = await request(app).get('/api/reports/revenue-by-company.csv?year=2026').buffer(true).expect(200);
		expect(String(csv.headers['content-disposition'])).to.contain('umsatz-je-firma.csv');
		expect(csv.text).to.contain('Bericht GmbH;2;140,00;26,60;166,60');
		await request(app)
			.get('/api/reports/revenue-by-company.xlsx')
			.buffer(true)
			.parse((res, callback) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => callback(null, Buffer.concat(chunks)));
			})
			.expect(200)
			.expect(res => expect((res.body as Buffer).subarray(0, 2).toString()).to.equal('PK'));
		await request(app).get('/api/reports/revenue-by-company?year=abc').expect(400);
	});

	it('proposes the next dunning step with the text filled in and never sends or marks by itself (R6.4)', async () => {
		const created = await request(app)
			.post('/api/invoices')
			.send({ ...draftBody, issueDate: '2020-01-01', deliveryDate: '2020-01-01', dueDate: '2020-01-15' })
			.expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);

		const list = (await request(app).get('/api/dunning/suggestions').expect(200)).body as {
			invoiceId: string;
			level: number;
			subject: string;
			text: string;
		}[];
		const mine = list.find(item => item.invoiceId === created.body.id)!;
		expect(mine.level).to.equal(1);
		expect(mine.subject).to.contain('Zahlungserinnerung');
		expect(mine.text).to.not.match(/\{\w+\}/);
		// looking changes nothing
		expect((await request(app).get(`/api/invoices/${created.body.id}`).expect(200)).body.reminderLevel).to.equal(0);

		const pdf = await request(app)
			.get('/api/dunning/suggestions.pdf')
			.buffer(true)
			.parse((res, callback) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => callback(null, Buffer.concat(chunks)));
			})
			.expect(200);
		expect(String(pdf.headers['content-type'])).to.contain('application/pdf');
		expect((pdf.body as Buffer).subarray(0, 4).toString()).to.equal('%PDF');
		const csv = await request(app).get('/api/dunning/suggestions.csv').buffer(true).expect(200);
		expect(csv.text).to.contain(mine.subject.split(' ').pop());

		// marking is the user's act; the same day nothing is proposed again
		await request(app).post(`/api/invoices/${created.body.id}/reminded`).expect(200);
		const after = (await request(app).get('/api/dunning/suggestions').expect(200)).body as { invoiceId: string }[];
		expect(after.some(item => item.invoiceId === created.body.id)).to.equal(false);
	});

	it('edits, validates and resets the dunning texts (R6.4)', async () => {
		const texts = (await request(app).get('/api/dunning/texts').expect(200)).body as {
			level: number;
			isDefault: boolean;
		}[];
		expect(texts.map(entry => entry.level)).to.deep.equal([1, 2, 3]);
		const saved = await request(app)
			.put('/api/dunning/texts/2')
			.send({ subject: 'Mahnung {number}', deadlineDays: 10 })
			.expect(200);
		expect(saved.body[1]).to.include({ subject: 'Mahnung {number}', deadlineDays: 10, isDefault: false });
		await request(app).put('/api/dunning/texts/2').send({ days: 3 }).expect(400);
		await request(app).put('/api/dunning/texts/9').send({ subject: 'x' }).expect(400);
		await request(app).put('/api/dunning/texts/2').send({ body: '' }).expect(400);
		const reset = await request(app).delete('/api/dunning/texts/2').expect(200);
		expect(reset.body[1].isDefault).to.equal(true);
		await request(app).delete('/api/dunning/texts/0').expect(400);
	});

	it('reports how current the newest backup is (0.9.2)', async () => {
		const first = (await request(app).get('/api/backups/status').expect(200)).body;
		expect(first).to.have.keys(['lastAt', 'ageHours', 'warning', 'intervalMinutes', 'keep']);
		await request(app).post('/api/backups').expect(201);
		const after = (await request(app).get('/api/backups/status').expect(200)).body;
		expect(after.warning).to.equal(null);
		expect(after.ageHours).to.equal(0);
		expect(after.lastAt).to.be.a('string');
	});

	it('filters the list and every export by issue date range, both days included, without drafts (0.9.3)', async () => {
		const company = await request(app)
			.post('/api/company-profiles')
			.send({ name: 'Zeitraum GmbH', profile: { ...seller, name: 'Zeitraum GmbH' } })
			.expect(201);
		const companyId = company.body.id as string;
		const make = async (issueDate: string, issue: boolean): Promise<string> => {
			const created = await request(app)
				.post('/api/invoices')
				.send({ ...draftBody, companyId, issueDate, deliveryDate: issueDate, dueDate: undefined })
				.expect(201);
			if (issue) {
				await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
			}
			return created.body.id as string;
		};
		await make('2026-07-31', true);
		const first = await make('2026-08-01', true);
		const middle = await make('2026-08-15', true);
		const last = await make('2026-08-31', true);
		await make('2026-09-01', true);
		const draftId = await make('2026-08-20', false);

		const base = `companyId=${companyId}&from=2026-08-01&to=2026-08-31`;
		// the list shows the range, drafts included
		const listed = await request(app).get(`/api/invoices?${base}`).expect(200);
		expect((listed.body as { id: string }[]).map(i => i.id)).to.have.members([first, middle, last, draftId]);

		// the CSV: the three issued invoices of August, the draft stays out, named after the range
		const csv = await request(app).get(`/api/invoices/export.csv?${base}`).buffer(true).expect(200);
		expect(String(csv.headers['content-disposition'])).to.contain('rechnungen_2026-08-01_2026-08-31.csv');
		const days = ['2026-08-01', '2026-08-15', '2026-08-31'];
		for (const day of days) {
			expect(csv.text, day).to.contain(day);
		}
		expect(csv.text).to.not.contain('2026-07-31').and.to.not.contain('2026-09-01');
		expect(csv.text).to.not.contain('2026-08-20');

		// only a start day or only an end day
		const from = await request(app)
			.get(`/api/invoices/export.csv?companyId=${companyId}&from=2026-08-31`)
			.expect(200);
		expect(String(from.headers['content-disposition'])).to.contain('rechnungen_ab-2026-08-31.csv');
		const to = await request(app)
			.get(`/api/invoices/export.datev?companyId=${companyId}&to=2026-08-01`)
			.expect(200);
		expect(String(to.headers['content-disposition'])).to.contain('rechnungen_bis-2026-08-01.datev');
		const xlsx = await request(app)
			.get(`/api/invoices/export.xlsx?${base}`)
			.buffer(true)
			.parse((res, callback) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => callback(null, Buffer.concat(chunks)));
			})
			.expect(200);
		expect(String(xlsx.headers['content-disposition'])).to.contain('_2026-08-01_2026-08-31.xlsx');

		// wrong input is refused on the list and on every export
		for (const route of [
			'/api/invoices',
			'/api/invoices/export.csv',
			'/api/invoices/export.datev',
			'/api/invoices/export.xlsx',
		]) {
			await request(app).get(`${route}?from=01.08.2026`).expect(400);
			await request(app).get(`${route}?from=2026-09-01&to=2026-08-01`).expect(400);
		}

		// a draft only comes into an export when its status is asked for
		const drafts = await request(app).get(`/api/invoices/export.csv?${base}&status=draft`).buffer(true).expect(200);
		expect(drafts.text).to.contain('2026-08-20');

		// leave no draft behind: other tests of this file count them
		await request(app)
			.delete(`/api/invoices/${draftId}`)
			.expect(res => expect([200, 204]).to.include(res.status));
	});

	it('lists issued documents without files and completes only what is missing (M1)', async () => {
		// nothing is incomplete after a normal issue
		const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
		let incomplete = (await request(app).get('/api/invoices/incomplete').expect(200)).body as {
			id: string;
			missing: string[];
		}[];
		expect(incomplete.some(item => item.id === created.body.id)).to.equal(false);

		// the Excel copy of the record is lost: the document shows up with exactly that
		db.attachIssueArtifacts(created.body.id, {
			xml: db.getInvoice(created.body.id)!.xml ?? undefined,
			pdfPath: db.getInvoice(created.body.id)!.pdfPath,
			xlsxPath: null as unknown as undefined,
			templateId: null,
		});
		incomplete = (await request(app).get('/api/invoices/incomplete').expect(200)).body;
		expect(incomplete.find(item => item.id === created.body.id)?.missing).to.deep.equal(['xlsx']);

		const repaired = await request(app).post(`/api/invoices/${created.body.id}/repair`).expect(200);
		expect(repaired.body.created).to.deep.equal(['xlsx']);
		expect(repaired.body.invoice.xlsxPath).to.match(/\.xlsx$/);
		incomplete = (await request(app).get('/api/invoices/incomplete').expect(200)).body;
		expect(incomplete.some(item => item.id === created.body.id)).to.equal(false);

		// a second run has nothing to do, a draft and an unknown id are refused
		expect(
			(await request(app).post(`/api/invoices/${created.body.id}/repair`).expect(200)).body.created,
		).to.deep.equal([]);
		const draft = await request(app).post('/api/invoices').send(draftBody).expect(201);
		await request(app).post(`/api/invoices/${draft.body.id}/repair`).expect(400);
		await request(app).post('/api/invoices/gibt-es-nicht/repair').expect(404);
		await request(app)
			.delete(`/api/invoices/${draft.body.id}`)
			.expect(res => expect([200, 204]).to.include(res.status));
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

	it('refuses a foreign host name without a token (DNS rebinding, H2)', async () => {
		await request(openApp).get('/api/invoices').set('Host', 'evil.example:8093').expect(403);
		await request(openApp).get('/api/invoices').set('Host', 'localhost:8093').expect(200);
		await request(openApp).get('/api/invoices').set('Host', '192.168.1.20:8093').expect(200);
		await request(openApp).get('/api/invoices').set('Host', '[::1]:8093').expect(200);
		// with a token the bearer header is the protection, any host name works
		await request(closedApp)
			.get('/api/invoices')
			.set('Host', 'iobroker.local:8093')
			.set('Authorization', 'Bearer s3cret')
			.expect(200);
	});

	it('refuses cross-origin writes without a token (CSRF, H2)', async () => {
		await request(openApp)
			.post('/api/backups')
			.set('Host', '127.0.0.1:8093')
			.set('Origin', 'https://evil.example')
			.expect(403);
		await request(openApp).post('/api/backups').set('Host', '127.0.0.1:8093').set('Origin', 'null').expect(403);
		await request(openApp)
			.post('/api/backups')
			.set('Host', '127.0.0.1:8093')
			.set('Sec-Fetch-Site', 'cross-site')
			.expect(403);
		// the PWA itself: same origin as the host header
		await request(openApp)
			.get('/api/invoices')
			.set('Host', '127.0.0.1:8093')
			.set('Origin', 'http://127.0.0.1:8093')
			.expect(200);
	});
});

describe('api => open items (R6.2)', function () {
	this.timeout(60000);
	let db: InvoiceDatabase;
	let app: ReturnType<typeof createApiServer>;
	const AS_OF = '2026-10-01';

	/**
	 * Issues an invoice through the API.
	 *
	 * @param customer - Buyer name.
	 * @param net - Net price of the single line (19 % VAT).
	 * @param dueDate - ISO due date.
	 * @param extra - Further body fields.
	 */
	const issueVia = async (
		customer: string,
		net: number,
		dueDate: string | undefined,
		extra: Record<string, unknown> = {},
	): Promise<string> => {
		const created = await request(app)
			.post('/api/invoices')
			.send({
				...draftBody,
				buyer: { ...buyer, name: customer },
				lines: [{ description: 'Leistung', quantity: 1, unit: 'Stk', unitPriceNet: net, vatRate: 19 }],
				dueDate,
				...extra,
			})
			.expect(201);
		await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
		return created.body.id as string;
	};

	before(async () => {
		db = new InvoiceDatabase(':memory:');
		db.migrate();
		app = createApiServer({
			db,
			storage: {
				write: (): Promise<void> => Promise.resolve(),
				read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
			},
			log: { info: (): void => undefined, error: (): void => undefined },
			version: 'x',
		});
		await issueVia('Alt AG', 1000, '2026-06-01'); // over 90 days
		await issueVia('Mittel GmbH', 500, '2026-09-10'); // 21 days
		await issueVia('Frisch KG', 100, '2026-10-20'); // not due
		const paid = await issueVia('Bezahlt AG', 300, '2026-09-01');
		await request(app).post(`/api/invoices/${paid}/paid`).send({ paid: true }).expect(200);
		// an offer carries a validity, never a claim
		await issueVia('Angebot AG', 800, undefined, { docType: 'quote', documentTitle: 'Angebot' });
		// a draft is not booked
		await request(app)
			.post('/api/invoices')
			.send({ ...draftBody, buyer: { ...buyer, name: 'Entwurf AG' } })
			.expect(201);
	});

	after(() => {
		db.close();
	});

	it('lists the open invoices with their age and the sums', async () => {
		const res = await request(app).get(`/api/open-items?asOf=${AS_OF}`).expect(200);
		expect(res.body.asOf).to.equal(AS_OF);
		expect(res.body.items.map((item: { customer: string }) => item.customer)).to.deep.equal([
			'Alt AG',
			'Mittel GmbH',
			'Frisch KG',
		]);
		expect(res.body.buckets.over90).to.deep.equal({ count: 1, amount: 1190 });
		expect(res.body.buckets.d1to30).to.deep.equal({ count: 1, amount: 595 });
		expect(res.body.buckets.notDue).to.deep.equal({ count: 1, amount: 119 });
		expect(res.body.total).to.deep.equal({ count: 3, amount: 1904 });
		expect(res.body.overdue).to.deep.equal({ count: 2, amount: 1785 });

		const overdueOnly = await request(app).get(`/api/open-items?asOf=${AS_OF}&onlyOverdue=1`).expect(200);
		expect(overdueOnly.body.total).to.deep.equal({ count: 2, amount: 1785 });
		expect(overdueOnly.body.onlyOverdue).to.equal(true);
	});

	it('keeps offers and drafts out, whatever the filter says', async () => {
		const all = await request(app).get(`/api/open-items?asOf=${AS_OF}`).expect(200);
		const names = all.body.items.map((item: { customer: string }) => item.customer);
		expect(names).to.not.include('Angebot AG');
		expect(names).to.not.include('Entwurf AG');
		expect(names).to.not.include('Bezahlt AG');
		// the document type is not a parameter of this route
		const forced = await request(app).get(`/api/open-items?asOf=${AS_OF}&docType=quote`).expect(200);
		expect(forced.body.items.map((item: { customer: string }) => item.customer)).to.not.include('Angebot AG');
	});

	it('carries the same sums in the JSON, the CSV and the Excel list', async () => {
		const json = (await request(app).get(`/api/open-items?asOf=${AS_OF}`).expect(200)).body;

		const csv = await request(app).get(`/api/open-items.csv?asOf=${AS_OF}`).buffer(true).expect(200);
		expect(String(csv.headers['content-type'])).to.contain('text/csv');
		expect(String(csv.headers['content-disposition'])).to.contain('offene-posten.csv');
		const lines = csv.text.split('\r\n');
		const csvRow = (label: string): string[] =>
			lines.map(line => line.split(';')).find(cols => cols[0] === 'Summe' && cols[1] === label)!;
		const german = (value: number): string => value.toFixed(2).replace('.', ',');
		expect(csvRow('gesamt').slice(2)).to.deep.equal([String(json.total.count), german(json.total.amount)]);
		expect(csvRow('davon überfällig').slice(2)).to.deep.equal([
			String(json.overdue.count),
			german(json.overdue.amount),
		]);
		expect(csvRow('über 90 Tage überfällig').slice(2)).to.deep.equal([
			String(json.buckets.over90.count),
			german(json.buckets.over90.amount),
		]);
		// one line per item, and the amounts of the lines add up to the total
		const itemLines = lines.filter(line => /^20\d\d-/.test(line));
		expect(itemLines).to.have.lengthOf(json.items.length);
		const csvSum = itemLines.reduce((sum, line) => sum + Number(line.split(';')[7].replace(',', '.')), 0);
		expect(Math.round(csvSum * 100) / 100).to.equal(json.total.amount);

		const xlsx = await request(app)
			.get(`/api/open-items.xlsx?asOf=${AS_OF}`)
			.buffer(true)
			.parse((res, callback) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => callback(null, Buffer.concat(chunks)));
			})
			.expect(200);
		const book = new ExcelJS.Workbook();
		await book.xlsx.load(xlsx.body);
		const sheet = book.getWorksheet('Offene Posten');
		expect(sheet, 'sheet Offene Posten').to.not.equal(undefined);
		const sums = new Map<string, { count: number; amount: number }>();
		let itemAmount = 0;
		let itemRows = 0;
		sheet!.eachRow(row => {
			const first = row.getCell(1).value;
			if (first === 'Summe') {
				sums.set(String(row.getCell(2).text), {
					count: Number(row.getCell(3).value),
					amount: Number(row.getCell(8).value),
				});
			} else if (typeof first === 'string' && /^20\d\d-/.test(first)) {
				itemRows += 1;
				itemAmount += Number(row.getCell(8).value);
			}
		});
		expect(sums.get('gesamt')).to.deep.equal(json.total);
		expect(sums.get('davon überfällig')).to.deep.equal(json.overdue);
		expect(sums.get('über 90 Tage überfällig')).to.deep.equal(json.buckets.over90);
		expect(itemRows).to.equal(json.items.length);
		expect(Math.round(itemAmount * 100) / 100).to.equal(json.total.amount);
	});

	it('refuses a malformed reference day', async () => {
		for (const route of ['/api/open-items', '/api/open-items.csv', '/api/open-items.xlsx']) {
			await request(app).get(`${route}?asOf=morgen`).expect(400);
		}
	});

	it('is as closed as the rest of the API when a token is set', async () => {
		const closed = createApiServer({
			db,
			storage: {
				write: (): Promise<void> => Promise.resolve(),
				read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
			},
			log: { info: (): void => undefined, error: (): void => undefined },
			version: 'x',
			authToken: 's3cret',
		});
		await request(closed).get('/api/open-items').expect(401);
		await request(closed).get('/api/open-items.csv').expect(401);
		await request(closed).get('/api/open-items').set('Authorization', 'Bearer s3cret').expect(200);
	});
});

describe('api => stored paths and download headers (M4/M5)', () => {
	it('never reads a path outside the storage and escapes the name in the header', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const reads: string[] = [];
			const app = createApiServer({
				db,
				storage: {
					write: (): Promise<void> => Promise.resolve(),
					read: (path: string): Promise<Buffer> => {
						reads.push(path);
						return Promise.resolve(Buffer.from('%PDF-1.4'));
					},
				},
				log: { info: (): void => undefined, error: (): void => undefined },
				version: 'x',
			});
			const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
			const issued = await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
			const id = issued.body.id as string;

			// a restored or damaged record that points out of the storage
			const dump = db.exportData();
			dump.invoices[0].pdfPath = '../../outside.pdf';
			dump.invoices[0].xlsxPath = '/etc/passwd';
			dump.invoices[0].number = 'A"; x=1\r\nX-Evil: 1';
			db.importData(dump);

			reads.length = 0;
			await request(app).get(`/api/invoices/${id}.pdf`).expect(404);
			await request(app).get(`/api/invoices/${id}.xlsx`).expect(404);
			expect(reads, 'nothing was read from the invalid paths').to.deep.equal([]);

			// the name in the header cannot break out of its quotes or add a header
			const xml = await request(app).get(`/api/invoices/${id}.xml`).expect(200);
			const disposition = String(xml.headers['content-disposition']);
			expect(disposition).to.match(/^attachment; filename="[^"\r\n]*"; filename\*=UTF-8''/);
			expect(xml.headers['x-evil']).to.equal(undefined);
		} finally {
			db.close();
		}
	});
});

describe('api => change notification (R5.2)', () => {
	it('tells the adapter after a successful write, never after a read or a refusal', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			let calls = 0;
			const app = createApiServer({
				db,
				storage: {
					write: (): Promise<void> => Promise.resolve(),
					read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
				},
				log: { info: (): void => undefined, error: (): void => undefined },
				version: 'x',
				onChange: () => {
					calls += 1;
				},
			});
			const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 20));

			await request(app).get('/api/invoices').expect(200);
			await request(app).get('/api/health').expect(200);
			await settle();
			expect(calls, 'reads do not notify').to.equal(0);

			// a refused write changed nothing
			await request(app).post('/api/invoices').send({}).expect(400);
			await settle();
			expect(calls, 'a 400 does not notify').to.equal(0);

			const created = await request(app).post('/api/invoices').send(draftBody).expect(201);
			await settle();
			expect(calls, 'a created draft notifies once').to.equal(1);

			await request(app).post(`/api/invoices/${created.body.id}/issue`).expect(200);
			await settle();
			expect(calls, 'an issue notifies again').to.equal(2);
		} finally {
			db.close();
		}
	});
});

describe('api => web app language (R7.2)', () => {
	const quiet = { info: (): void => undefined, error: (): void => undefined };
	const stubStorage = {
		write: (): Promise<void> => Promise.resolve(),
		read: (): Promise<Buffer> => Promise.reject(new Error('empty')),
	};
	const settingsOf = (pwaLanguage?: string): NonNullable<Parameters<typeof createApiServer>[0]['settings']> => ({
		defaultVatRate: 19,
		defaultPaymentTerms: '',
		numberFormat: '{YYYY}-{EMPLOYEE}-{SEQ}',
		quoteNumberFormat: 'A-{YYYY}-{EMPLOYEE}-{SEQ}',
		storageMount: '',
		backupIntervalMinutes: 0,
		pwaLanguage,
	});

	it('hands the language chosen in the admin to the web app', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			for (const [configured, expected] of [
				['en', 'en'],
				['de', 'de'],
				['auto', 'auto'],
				// a language the web app does not ship must not leak through
				['fr', 'auto'],
				[undefined, 'auto'],
			] as const) {
				const app = createApiServer({
					db,
					storage: stubStorage,
					log: quiet,
					version: 'x',
					settings: settingsOf(configured),
				});
				const settings = await request(app).get('/api/settings').expect(200);
				expect(settings.body.pwaLanguage, `configured ${String(configured)}`).to.equal(expected);
				const health = await request(app).get('/api/health').expect(200);
				expect(health.body.pwaLanguage).to.equal(expected);
			}
		} finally {
			db.close();
		}
	});

	it('keeps the language readable on the login page, where no token exists yet', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const app = createApiServer({
				db,
				storage: stubStorage,
				log: quiet,
				version: 'x',
				authToken: 's3cret',
				settings: settingsOf('en'),
			});
			// health is the one open route, the settings need the token
			const health = await request(app).get('/api/health').expect(200);
			expect(health.body.pwaLanguage).to.equal('en');
			await request(app).get('/api/settings').expect(401);
		} finally {
			db.close();
		}
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

		// R7.9: the test print offers three sample documents that lay out differently
		const prints: Record<string, Buffer> = {};
		for (const sample of ['full', 'small', 'credit']) {
			const res = await request(app)
				.post('/api/templates/preview')
				.send({ definition: { ...DEFAULT_TEMPLATE, name: 'Vorschau' }, sample })
				.buffer(true)
				.parse((response, callback) => {
					const chunks: Buffer[] = [];
					response.on('data', (chunk: Buffer) => chunks.push(chunk));
					response.on('end', () => callback(null, Buffer.concat(chunks)));
				})
				.expect(200);
			prints[sample] = res.body as Buffer;
			expect(prints[sample].subarray(0, 4).toString()).to.equal('%PDF');
		}
		expect(prints.full.equals(prints.small)).to.equal(false);
		expect(prints.full.equals(prints.credit)).to.equal(false);
		expect(prints.small.equals(prints.credit)).to.equal(false);
		await request(app)
			.post('/api/templates/preview')
			.send({ definition: { ...DEFAULT_TEMPLATE, name: 'Vorschau' }, sample: 'bogus' })
			.expect(400);

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

	it('stores the two header distances, takes them back and refuses nonsense', async () => {
		const created = await request(app)
			.post('/api/templates')
			.send({
				name: 'Briefkopf',
				definition: { ...DEFAULT_TEMPLATE, name: 'Briefkopf', logoTopMm: 20, textTopMm: 62.5 },
			})
			.expect(201);
		const id = created.body.id as string;
		expect(created.body.definition.logoTopMm).to.equal(20);
		expect(created.body.definition.textTopMm).to.equal(62.5);
		const read = await request(app).get(`/api/templates/${id}`).expect(200);
		expect(read.body.definition).to.include({ logoTopMm: 20, textTopMm: 62.5 });

		// the preview renders with them
		const preview = await request(app)
			.post('/api/templates/preview')
			.send({ definition: { ...DEFAULT_TEMPLATE, textTopMm: 80 } })
			.expect(200);
		expect(Buffer.from(preview.body).subarray(0, 4).toString()).to.equal('%PDF');

		// nonsense is refused with the name of the field, nothing is stored
		for (const bad of [-1, 151, 'zehn']) {
			const refused = await request(app)
				.put(`/api/templates/${id}`)
				.send({ name: 'Briefkopf', definition: { ...DEFAULT_TEMPLATE, name: 'Briefkopf', logoTopMm: bad } })
				.expect(400);
			expect(String(refused.body.error)).to.contain('Logo-Abstand oben');
		}
		const still = await request(app).get(`/api/templates/${id}`).expect(200);
		expect(still.body.definition.logoTopMm).to.equal(20);

		// an update merges what it receives: leaving the keys out keeps the stored values …
		const kept = await request(app)
			.put(`/api/templates/${id}`)
			.send({ name: 'Briefkopf', definition: { ...DEFAULT_TEMPLATE, name: 'Briefkopf' } })
			.expect(200);
		expect(kept.body.definition).to.include({ logoTopMm: 20, textTopMm: 62.5 });

		// … and `null` is how the form says "empty again": the properties are gone, the old layout is back
		const cleared = await request(app)
			.put(`/api/templates/${id}`)
			.send({
				name: 'Briefkopf',
				definition: { ...DEFAULT_TEMPLATE, name: 'Briefkopf', logoTopMm: null, textTopMm: null },
			})
			.expect(200);
		expect(Object.keys(cleared.body.definition)).to.not.include.members(['logoTopMm']);
		expect(Object.keys(cleared.body.definition)).to.not.include.members(['textTopMm']);
		expect(cleared.body.definition.logoTopMm).to.equal(undefined);
		expect(cleared.body.definition.textTopMm).to.equal(undefined);
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

	it('does not take an attachment for a mandatory field (R5.1)', async () => {
		// The customer number (BT-10) must stand in the structured data. A delivery
		// note that mentions it does not help: the recipient's system reads the XML.
		const created = await request(app)
			.post('/api/invoices')
			.send({ ...draftBody, buyer: { ...buyer, customerNumber: '' } })
			.expect(201);
		const id = created.body.id as string;
		const pdf = Buffer.from('%PDF-1.4\nKundennummer: K-4711\n%%EOF\n', 'latin1');
		await request(app)
			.post(`/api/invoices/${id}/attachments`)
			.send({
				filename: 'Bestellung mit Kundennummer.pdf',
				mime: 'application/pdf',
				dataBase64: pdf.toString('base64'),
			})
			.expect(201);

		const countersBefore = db.exportData().counters;
		const refused = await request(app).post(`/api/invoices/${id}/issue`).expect(400);
		expect(String(refused.body.error)).to.contain('customer number');

		// nothing was booked: still a draft, no number, no counter moved, attachment untouched
		const after = await request(app).get(`/api/invoices/${id}`).expect(200);
		expect(after.body.status).to.equal('draft');
		expect(after.body.number).to.equal(null);
		expect(db.exportData().counters).to.deep.equal(countersBefore);
		expect((await request(app).get(`/api/invoices/${id}/attachments`).expect(200)).body).to.have.lengthOf(1);

		// the validation reports the same gap instead of reading the attachment
		const validation = await request(app).post(`/api/invoices/${id}/validate`).expect(200);
		expect(validation.body.businessErrors.join(' ')).to.contain('customer number');
	});

	it('validates a draft without booking it (R5.1)', async () => {
		// A draft may be checked as often as the user likes: the answer is the list of
		// findings, never a number, a file or a changed record. (An earlier plan was to
		// refuse drafts with 409; the detail page offers the check on drafts and R2 keeps
		// a report per run, so the behaviour is fixed as it is.)
		const complete = (await request(app).post('/api/invoices').send(draftBody).expect(201)).body.id as string;
		const incomplete = (
			await request(app)
				.post('/api/invoices')
				.send({ ...draftBody, lines: [] })
				.expect(201)
		).body.id as string;
		const countersBefore = db.exportData().counters;
		const countsBefore = (await request(app).get('/api/health').expect(200)).body.counts;

		const ok = await request(app).post(`/api/invoices/${complete}/validate`).expect(200);
		expect(ok.body.formatErrors).to.deep.equal([]);
		expect(ok.body.businessErrors).to.deep.equal([]);
		// the report is kept under the id of the draft, there is no number yet
		expect(String(ok.body.report.path)).to.contain(`${complete}.validation-`);

		const broken = await request(app).post(`/api/invoices/${incomplete}/validate`).expect(200);
		expect(broken.body.businessErrors).to.not.deep.equal([]);
		expect(broken.body.formatErrors).to.deep.equal([]);

		for (const id of [complete, incomplete]) {
			const draft = await request(app).get(`/api/invoices/${id}`).expect(200);
			expect(draft.body.status).to.equal('draft');
			expect(draft.body.number).to.equal(null);
			expect(draft.body.xml).to.equal(null);
			expect(draft.body.pdfPath).to.equal(null);
		}
		// no number was used up and nothing changed state
		expect(db.exportData().counters).to.deep.equal(countersBefore);
		expect((await request(app).get('/api/health').expect(200)).body.counts).to.deep.equal(countsBefore);
		// every run is a report of its own
		const again = await request(app).post(`/api/invoices/${complete}/validate`).expect(200);
		expect(again.body.report.seq).to.equal(ok.body.report.seq + 1);
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

		// R8: the offer names the invoices that came out of it (the PWA links both
		// directions), and an offer without a conversion has nothing to show
		const derived = await request(app).get(`/api/invoices?docType=invoice&sourceDocumentId=${id}`).expect(200);
		expect(derived.body).to.have.length(2);
		expect(derived.body.map((entry: { id: string }) => entry.id)).to.include(converted.body.id);
		const nothing = await request(app).get(`/api/invoices?sourceDocumentId=${converted.body.id}`).expect(200);
		expect(nothing.body).to.deep.equal([]);

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

		// the accounting exports separate the two document types: without a
		// parameter they are invoices only, so an offer number can never end up
		// in a booking list by accident (§11.8). `docType=all` is the explicit
		// single-query answer for both kinds.
		const csv = await request(app).get('/api/invoices/export.csv').expect(200);
		expect(csv.text).to.not.contain('A-2026-00-001');
		const bothCsv = await request(app).get('/api/invoices/export.csv?docType=all').expect(200);
		expect(bothCsv.text).to.contain('A-2026-00-001');
		expect(bothCsv.text).to.contain('Angebot');
		const onlyInvoices = await request(app).get('/api/invoices/export.csv?docType=invoice').expect(200);
		expect(onlyInvoices.text).to.not.contain('A-2026-00-001');
		// the default is exactly the invoice view, not a third variant
		expect(csv.text).to.equal(onlyInvoices.text);
		const onlyQuotes = await request(app).get('/api/invoices/export.csv?docType=quote').expect(200);
		expect(onlyQuotes.text).to.contain('A-2026-00-001');
		const datev = await request(app).get('/api/invoices/export.datev').expect(200);
		expect(datev.text).to.contain('EXTF');
		expect(datev.text).to.not.contain('A-2026-00-001');
		const datevInvoices = await request(app).get('/api/invoices/export.datev?docType=invoice').expect(200);
		expect(datev.text).to.equal(datevInvoices.text);
		const datevQuotes = await request(app).get('/api/invoices/export.datev?docType=quote').expect(200);
		expect(datevQuotes.text).to.contain('A-2026-00-001');
		const xlsx = await request(app).get('/api/invoices/export.xlsx').expect(200);
		expect(xlsx.headers['content-type']).to.contain('spreadsheetml');
		await request(app).get('/api/invoices/export.xlsx?docType=all').expect(200);
		// an unknown word is not a document type: it falls back to the export
		// default instead of silently exporting everything
		const nonsense = await request(app).get('/api/invoices/export.csv?docType=Auftrag').expect(200);
		expect(nonsense.text).to.equal(csv.text);
	});
});
