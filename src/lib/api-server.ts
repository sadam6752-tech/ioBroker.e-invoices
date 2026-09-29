/**
 * HTTP JSON API for ioBroker.e-invoices (P4a).
 *
 * Pure Express factory — no js-controller needed, fully testable with
 * supertest. main.ts mounts it on the adapter port and serves the PWA.
 * v1 has no auth (LAN trust); token auth follows with the admin config (P6).
 */
import express, { type Express, type Request, type Response } from 'express';
import { existsSync, statSync } from 'node:fs';
import type {
	InvoiceDatabase,
	NewProduct,
	ProductPatch,
	StoredCompanyProfile,
	StoredCustomer,
	StoredInvoice,
} from './db';
import {
	blankDraft,
	calcTotals,
	validateInvoiceForIssue,
	type InvoiceDraftInput,
	type InvoiceStatus,
	ALLOWED_VAT_RATES,
	DEFAULT_NUMBER_FORMAT,
} from './invoice-model';
import { issueInvoiceWithArtifacts, rerenderInvoicePdf, type ArtifactWriter, type IssueLogger } from './issue-service';
import { createBackup, restoreBackup } from './backup';
import { renderInvoiceListWorkbook } from './excel';
import { renderInvoicePdf } from './pdf';
import { validateTemplate, type LayoutTemplate } from './templates';
import { validateArtifacts } from './validation';
import { generateInvoiceXml } from './zugferd';

/** File backend behind the API (mountpoint in prod, memory in tests). */
export interface ArtifactStorage {
	/** Write an artifact file. */
	write: ArtifactWriter;
	/** Read an artifact file (for downloads). */
	read(relPath: string): Promise<Buffer>;
}

/** Dependencies injected by main.ts (or tests). */
export interface ApiServerDeps {
	/** Open invoice database. */
	db: InvoiceDatabase;
	/** Artifact file backend. */
	storage: ArtifactStorage;
	/** Logger. */
	log: IssueLogger;
	/** Adapter version for /api/health. */
	version: string;
	/** Bearer token; when empty, the API trusts the LAN (documented). */
	authToken?: string;
	/** Invoicing defaults from the instance config (read by the PWA). */
	settings?: {
		defaultVatRate: number;
		defaultPaymentTerms: string;
		numberFormat: string;
		storageMount: string;
		backupIntervalMinutes: number;
	};
}

/**
 * Builds a non-persisted preview invoice for validation runs.
 *
 * @param draft - Draft content to preview.
 */
export function previewInvoice(draft: InvoiceDraftInput): StoredInvoice {
	const stamp = new Date().toISOString();
	return {
		id: 'preview',
		number: 'PREVIEW',
		issueDate: draft.issueDate,
		deliveryDate: draft.deliveryDate,
		dueDate: draft.dueDate ?? null,
		seller: draft.seller,
		buyer: draft.buyer,
		lines: draft.lines,
		totals: calcTotals(draft.lines.length > 0 ? draft.lines : []),
		profile: 'EN16931',
		status: 'draft',
		templateId: null,
		documentTitle: draft.documentTitle ?? 'Rechnung',
		notes: draft.notes ?? null,
		paymentTerms: draft.paymentTerms ?? null,
		employeeCode: draft.employeeCode ?? null,
		skontoPercent: Number(draft.skontoPercent) || 0,
		skontoDueDate: draft.skontoDueDate ?? null,
		paid: false,
		paidAt: null,
		stornoOfId: null,
		xml: null,
		pdfPath: null,
		xlsxPath: null,
		createdAt: stamp,
		updatedAt: stamp,
	};
}

/**
 * Converts a stored invoice back to draft input (for validation).
 *
 * @param invoice - Stored invoice.
 */
export function storedToDraft(invoice: StoredInvoice): InvoiceDraftInput {
	return {
		seller: invoice.seller,
		buyer: invoice.buyer,
		lines: invoice.lines,
		issueDate: invoice.issueDate,
		deliveryDate: invoice.deliveryDate,
		dueDate: invoice.dueDate ?? undefined,
		currency: 'EUR',
		documentTitle: invoice.documentTitle,
		notes: invoice.notes ?? undefined,
		paymentTerms: invoice.paymentTerms ?? undefined,
	};
}

function isMissingError(error: unknown): boolean {
	return /not found/i.test((error as Error).message);
}

/**
 * True when a storage-relative path stays inside the mountpoint.
 * Guards logo and artifact reads against `../` traversal from user input.
 *
 * @param relPath - Path taken from user input.
 */
function isContainedRelPath(relPath: string): boolean {
	if (relPath.includes('\\') || relPath.startsWith('/') || /^[A-Za-z]:/.test(relPath)) {
		return false;
	}
	return !relPath.split('/').some(segment => segment === '..' || segment === '');
}

/**
 * Verifies that a request body field, when present, has the expected runtime
 * shape. Without this a client can store `lines: {}` as an invoice and break
 * every later read of that record.
 *
 * @param body - Parsed request body.
 * @param rules - Field name to expected kind.
 * @returns An error message, or undefined when everything matches.
 */
function findShapeError(body: Record<string, unknown>, rules: Record<string, 'object' | 'array'>): string | undefined {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return 'Body must be a JSON object';
	}
	for (const [field, kind] of Object.entries(rules)) {
		const value = body[field];
		if (value === undefined) {
			continue;
		}
		if (kind === 'array' && !Array.isArray(value)) {
			return `Field ${field} must be an array`;
		}
		if (kind === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
			return `Field ${field} must be an object`;
		}
	}
	return undefined;
}

/**
 * Reads a single route param (Express 5 types it as string|string[]).
 *
 * @param req - Express request.
 * @param name - Param name.
 */
export function routeParam(req: Request, name: string): string {
	const value = req.params[name];
	return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

/**
 * Creates the Express API app (no listen — main.ts owns the socket).
 *
 * @param deps - Database, storage, logger and version.
 */
export function createApiServer(deps: ApiServerDeps): Express {
	const { db, storage, log, version, authToken } = deps;
	const settings = {
		defaultVatRate: ALLOWED_VAT_RATES.includes(Number(deps.settings?.defaultVatRate))
			? Number(deps.settings?.defaultVatRate)
			: 19,
		defaultPaymentTerms: deps.settings?.defaultPaymentTerms?.trim() ?? '',
		numberFormat: deps.settings?.numberFormat?.trim() || DEFAULT_NUMBER_FORMAT,
		storageMount: deps.settings?.storageMount?.trim() ?? '',
		backupIntervalMinutes: Math.max(0, Math.round(Number(deps.settings?.backupIntervalMinutes) || 0)),
	};
	const app = express();
	app.disable('x-powered-by');
	app.use(express.json({ limit: '25mb' }));
	// Invoice data and rendered artifacts must never be reused from a cache:
	// a stored PDF keeps the layout it had when it was issued, and a cached
	// preview would hide a corrected rendering until the cache expired.
	app.use('/api', (_req, res, next) => {
		res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
		res.set('Pragma', 'no-cache');
		next();
	});

	if (authToken) {
		app.use('/api', (req, res, next) => {
			if (req.path === '/health') {
				next();
				return;
			}
			if (req.headers.authorization === `Bearer ${authToken}`) {
				next();
				return;
			}
			res.status(401).json({ error: 'Unauthorized' });
		});
	}

	const route =
		(handler: (req: Request, res: Response) => void | Promise<void>) =>
		(req: Request, res: Response, next: (error: unknown) => void): void => {
			try {
				const result = handler(req, res);
				if (result instanceof Promise) {
					result.catch(next);
				}
			} catch (error) {
				next(error);
			}
		};

	app.get('/api/health', (_req, res) => {
		res.json({ status: 'ok', version, schemaVersion: db.currentVersion(), counts: db.countByStatus() });
	});

	// Defaults from the instance config so the wizard can prefill sensibly
	app.get('/api/settings', (_req, res) => {
		res.json(settings);
	});

	app.get(
		'/api/invoices',
		route((req, res) => {
			const status = typeof req.query.status === 'string' ? (req.query.status as InvoiceStatus) : undefined;
			const year = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
			const query = typeof req.query.q === 'string' ? req.query.q : undefined;
			const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
			const offset = typeof req.query.offset === 'string' ? Number(req.query.offset) : undefined;
			res.json(db.listInvoices({ status, year, query, limit, offset }));
		}),
	);

	app.post(
		'/api/invoices',
		route((req, res) => {
			const input = (req.body ?? {}) as Partial<InvoiceDraftInput>;
			if (!input.seller || !input.buyer || !Array.isArray(input.lines)) {
				res.status(400).json({ error: 'Body needs seller, buyer and lines[]' });
				return;
			}
			if (findShapeError(input, { seller: 'object', buyer: 'object', lines: 'array' })) {
				res.status(400).json({ error: 'Body needs seller, buyer and lines[]' });
				return;
			}
			try {
				const created = db.createDraft({ ...blankDraft(), ...input });
				log.info(`API draft created: ${created.id}`);
				res.status(201).json(created);
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	// Sammel-Export BEFORE /:id — Express :id also matches dots (export.xlsx).
	app.get('/api/invoices/export.xlsx', (req, res) => {
		const status = typeof req.query.status === 'string' ? (req.query.status as InvoiceStatus) : undefined;
		const year = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
		const query = typeof req.query.q === 'string' ? req.query.q : undefined;
		const invoices = db.listInvoices({ status, year, query, limit: 500 });
		const stamp = new Date().toISOString().slice(0, 10);
		void renderInvoiceListWorkbook(invoices, `Rechnungsübersicht ${stamp}`).then(
			buffer => {
				res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				res.set('Content-Disposition', `attachment; filename="export-${stamp}.xlsx"`);
				res.send(buffer);
			},
			(error: Error) => {
				res.status(500).json({ error: `Export failed: ${error.message}` });
			},
		);
	});

	// Download routes BEFORE /:id — Express :id also matches dots (x.pdf).
	app.get(
		'/api/invoices/:id.xml',
		route((req, res) => {
			const invoice = db.getInvoice(routeParam(req, 'id'));
			if (!invoice?.xml) {
				res.status(404).json({ error: 'No XML for this invoice (not issued yet?)' });
				return;
			}
			res.type('application/xml');
			res.set('Content-Disposition', `attachment; filename="${invoice.number ?? invoice.id}.xml"`);
			res.send(invoice.xml);
		}),
	);

	app.get(
		'/api/invoices/:id.pdf',
		route(async (req, res) => {
			const invoice = db.getInvoice(routeParam(req, 'id'));
			if (!invoice?.pdfPath) {
				res.status(404).json({ error: 'No PDF for this invoice (not issued yet?)' });
				return;
			}
			try {
				const data = await storage.read(invoice.pdfPath);
				res.type('application/pdf');
				res.set('Content-Disposition', `inline; filename="${invoice.number ?? invoice.id}.pdf"`);
				res.send(data);
			} catch {
				res.status(404).json({ error: `Artifact file missing: ${invoice.pdfPath}` });
			}
		}),
	);

	app.get(
		'/api/invoices/:id.xlsx',
		route(async (req, res) => {
			const invoice = db.getInvoice(routeParam(req, 'id'));
			if (!invoice?.xlsxPath) {
				res.status(404).json({ error: 'No Excel copy for this invoice (not issued yet?)' });
				return;
			}
			try {
				const data = await storage.read(invoice.xlsxPath);
				res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				res.set('Content-Disposition', `attachment; filename="${invoice.number ?? invoice.id}.xlsx"`);
				res.send(data);
			} catch {
				res.status(404).json({ error: `Artifact file missing: ${invoice.xlsxPath}` });
			}
		}),
	);

	app.get(
		'/api/invoices/:id',
		route((req, res) => {
			const invoice = db.getInvoice(routeParam(req, 'id'));
			if (!invoice) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			res.json(invoice);
		}),
	);

	app.post(
		'/api/invoices/:id/paid',
		route((req, res) => {
			const body = (req.body ?? {}) as { paid?: unknown; paidAt?: unknown };
			if (typeof body.paid !== 'boolean') {
				res.status(400).json({ error: 'Body needs { paid: true|false }' });
				return;
			}
			if (body.paidAt !== undefined && typeof body.paidAt !== 'string') {
				res.status(400).json({ error: 'paidAt must be an ISO date' });
				return;
			}
			try {
				res.json(db.setPaid(routeParam(req, 'id'), body.paid, body.paidAt));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/storno',
		route((req, res) => {
			const body = (req.body ?? {}) as { reason?: unknown };
			if (body.reason !== undefined && typeof body.reason !== 'string') {
				res.status(400).json({ error: 'reason must be a string' });
				return;
			}
			try {
				const result = db.reverseInvoice(routeParam(req, 'id'), body.reason);
				log.info(`Storno created for ${result.original.number}: draft ${result.reversal.id}`);
				res.status(201).json(result);
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.patch(
		'/api/invoices/:id',
		route((req, res) => {
			const patch = (req.body ?? {}) as Partial<InvoiceDraftInput>;
			// Without this a body of {"lines":{}} zeroes the totals and stores a
			// non-array, which then breaks every later read, validate and issue.
			const bad = findShapeError(patch, { seller: 'object', buyer: 'object', lines: 'array' });
			if (bad) {
				res.status(400).json({ error: bad });
				return;
			}
			try {
				res.json(db.updateDraft(routeParam(req, 'id'), patch));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/issue',
		route(async (req, res) => {
			try {
				const outcome = await issueInvoiceWithArtifacts(db, log, routeParam(req, 'id'), storage);
				res.json(outcome.invoice);
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/rerender',
		route(async (req, res) => {
			const body = (req.body ?? {}) as { reason?: unknown };
			const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;
			try {
				const outcome = await rerenderInvoicePdf(db, log, routeParam(req, 'id'), storage, reason);
				res.json({ invoice: outcome.invoice, archivedPath: outcome.archivedPath });
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get(
		'/api/invoices/:id/renders',
		route((req, res) => {
			const id = routeParam(req, 'id');
			if (!db.getInvoice(id)) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			res.json(db.listRenderHistory(id));
		}),
	);

	app.post(
		'/api/invoices/:id/validate',
		route(async (req, res) => {
			const invoice = db.getInvoice(routeParam(req, 'id'));
			if (!invoice) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			const draft = storedToDraft(invoice);
			const businessErrors = validateInvoiceForIssue(draft);
			if (businessErrors.length > 0) {
				res.json({ formatErrors: [], businessErrors });
				return;
			}
			try {
				const preview = previewInvoice(draft);
				const { xml } = await generateInvoiceXml(preview);
				res.json(await validateArtifacts(preview, xml));
			} catch (error) {
				res.json({ formatErrors: [(error as Error).message], businessErrors });
			}
		}),
	);

	app.get('/api/templates', (_req, res) => {
		res.json(db.listTemplates());
	});

	app.post(
		'/api/templates',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: unknown; definition?: unknown };
			if (typeof body.name !== 'string') {
				res.status(400).json({ error: 'Body needs name and definition' });
				return;
			}
			try {
				res.status(201).json(db.createTemplate(body.name, body.definition as LayoutTemplate));
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/templates/preview',
		route(async (req, res) => {
			const body = (req.body ?? {}) as { definition?: unknown; companyId?: unknown };
			const errors = validateTemplate(body.definition);
			if (errors.length > 0) {
				res.status(400).json({ error: errors.join(' | ') });
				return;
			}
			const definition = body.definition as LayoutTemplate;
			const companyId = typeof body.companyId === 'string' ? body.companyId : definition.companyId;
			let seller = {
				name: 'Muster GmbH',
				street: 'Beispielstr. 1',
				zip: '10115',
				city: 'Berlin',
				country: 'DE',
				vatId: 'DE123456789',
				iban: 'DE02120300000000202051',
				email: 'rechnung@muster.example',
			};
			if (companyId) {
				const company = db.getCompanyProfile(companyId) ?? db.getDefaultCompanyProfile();
				if (company?.profile.name.trim()) {
					seller = { ...seller, ...company.profile };
				}
			}
			const sample = previewInvoice({
				seller,
				buyer: {
					name: 'Kunde AG',
					street: 'Kundenweg 5',
					zip: '80331',
					city: 'München',
					country: 'DE',
					customerNumber: 'K-42',
				},
				lines: [
					{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
					{ description: 'Anfahrt', quantity: 1, unit: 'Stk', unitPriceNet: 50, vatRate: 19 },
				],
				issueDate: '2026-09-28',
				deliveryDate: '2026-09-27',
				dueDate: '2026-10-12',
				currency: 'EUR',
				documentTitle: 'Rechnung',
				notes: 'Dies ist eine Layout-Vorschau.',
				paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
			});
			let logo: { data: Buffer } | undefined;
			if (definition.logo?.path && isContainedRelPath(definition.logo.path)) {
				try {
					logo = { data: await storage.read(definition.logo.path) };
				} catch {
					logo = undefined;
				}
			}
			const pdf = await renderInvoicePdf(sample, definition, logo);
			res.type('application/pdf').send(pdf);
		}),
	);

	app.get(
		'/api/templates/:tid',
		route((req, res) => {
			const template = db.getTemplate(routeParam(req, 'tid'));
			if (!template) {
				res.status(404).json({ error: 'Template not found' });
				return;
			}
			res.json(template);
		}),
	);

	app.put(
		'/api/templates/:tid',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: string; definition?: LayoutTemplate };
			try {
				res.json(db.updateTemplate(routeParam(req, 'tid'), body));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.delete(
		'/api/templates/:tid',
		route((req, res) => {
			try {
				db.deleteTemplate(routeParam(req, 'tid'));
				res.json({ ok: true });
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/templates/:tid/default',
		route((req, res) => {
			try {
				res.json(db.setDefaultTemplate(routeParam(req, 'tid')));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/templates/:tid/logo',
		route(async (req, res) => {
			const template = db.getTemplate(routeParam(req, 'tid'));
			if (!template) {
				res.status(404).json({ error: 'Template not found' });
				return;
			}
			const body = (req.body ?? {}) as { filename?: unknown; mime?: unknown; dataBase64?: unknown };
			if (
				typeof body.filename !== 'string' ||
				typeof body.mime !== 'string' ||
				typeof body.dataBase64 !== 'string'
			) {
				res.status(400).json({ error: 'Body needs filename, mime and dataBase64' });
				return;
			}
			const ext = body.filename.split('.').pop()?.toLowerCase();
			if ((ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') || !body.mime.startsWith('image/')) {
				res.status(400).json({ error: 'Only PNG/JPEG logos are supported' });
				return;
			}
			let data: Buffer;
			try {
				data = Buffer.from(body.dataBase64, 'base64');
			} catch {
				res.status(400).json({ error: 'dataBase64 is not valid base64' });
				return;
			}
			if (data.length === 0 || data.length > 2 * 1024 * 1024) {
				res.status(400).json({ error: 'Logo must be 1 byte – 2 MB' });
				return;
			}
			const isPng = data.length > 4 && data.readUInt32BE(0) === 0x89504e47;
			const isJpeg = data.length > 2 && data[0] === 0xff && data[1] === 0xd8;
			if (!isPng && !isJpeg) {
				res.status(400).json({ error: 'File content is no PNG/JPEG image' });
				return;
			}
			const logoPath = `logos/${template.id}.${ext === 'jpeg' ? 'jpg' : ext}`;
			try {
				await storage.write(logoPath, data);
			} catch (error) {
				res.status(500).json({ error: `Cannot store logo: ${(error as Error).message}` });
				return;
			}
			try {
				res.json(
					db.updateTemplate(template.id, {
						definition: {
							...template.definition,
							logo: {
								path: logoPath,
								position: template.definition.logo?.position ?? 'right',
								widthMm: template.definition.logo?.widthMm ?? 30,
							},
						},
					}),
				);
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/backups',
		route(async (_req, res) => {
			try {
				const backup = await createBackup(db, storage, log, version);
				try {
					await storage.write(backup.filename, backup.data);
				} catch (error) {
					res.status(500).json({ error: `Cannot store backup: ${(error as Error).message}` });
					return;
				}
				const logged = db.logBackup({
					filename: backup.filename,
					size: backup.size,
					sha256: backup.sha256,
					manifestJson: JSON.stringify(backup.manifest),
				});
				log.info(`Backup created: ${backup.filename} (${backup.size} bytes)`);
				res.status(201).json(logged);
			} catch (error) {
				res.status(500).json({ error: `Backup failed: ${(error as Error).message}` });
			}
		}),
	);

	app.get('/api/backups', (_req, res) => {
		res.json(db.listBackups());
	});

	app.get(
		'/api/backups/file/:name',
		route(async (req, res) => {
			const name = routeParam(req, 'name').replace(/[^A-Za-z0-9_.-]/g, '');
			try {
				const data = await storage.read(`backups/${name}`);
				res.type('application/zip');
				res.set('Content-Disposition', `attachment; filename="${name}"`);
				res.send(data);
			} catch {
				res.status(404).json({ error: 'Backup file not found' });
			}
		}),
	);

	app.post(
		'/api/restore',
		route(async (req, res) => {
			const body = (req.body ?? {}) as { filename?: unknown; dataBase64?: unknown };
			let data: Buffer;
			if (typeof body.dataBase64 === 'string' && body.dataBase64.length > 0) {
				try {
					data = Buffer.from(body.dataBase64, 'base64');
				} catch {
					res.status(400).json({ error: 'dataBase64 is not valid base64' });
					return;
				}
			} else if (typeof body.filename === 'string' && body.filename.length > 0) {
				const name = body.filename.split('/').pop() ?? '';
				try {
					data = await storage.read(`backups/${name.replace(/[^A-Za-z0-9_.-]/g, '')}`);
				} catch {
					res.status(404).json({ error: 'Backup file not found' });
					return;
				}
			} else {
				res.status(400).json({ error: 'Body needs filename or dataBase64' });
				return;
			}
			try {
				res.json(await restoreBackup(db, storage, data, log));
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get('/api/company-profiles', (_req, res) => {
		res.json(db.listCompanyProfiles());
	});

	app.get('/api/company-profiles/default', (_req, res) => {
		res.json(db.getDefaultCompanyProfile());
	});

	app.post(
		'/api/company-profiles',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: unknown; profile?: unknown };
			if (
				typeof body.name !== 'string' ||
				typeof body.profile !== 'object' ||
				!body.profile ||
				Array.isArray(body.profile)
			) {
				res.status(400).json({ error: 'Body needs name and profile' });
				return;
			}
			try {
				res.status(201).json(
					db.createCompanyProfile(body.name, body.profile as StoredCompanyProfile['profile']),
				);
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get(
		'/api/company-profiles/:cid',
		route((req, res) => {
			const profile = db.getCompanyProfile(routeParam(req, 'cid'));
			if (!profile) {
				res.status(404).json({ error: 'Company profile not found' });
				return;
			}
			res.json(profile);
		}),
	);

	app.put(
		'/api/company-profiles/:cid',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: string; profile?: StoredCompanyProfile['profile'] };
			try {
				res.json(db.updateCompanyProfile(routeParam(req, 'cid'), body));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.delete(
		'/api/company-profiles/:cid',
		route((req, res) => {
			try {
				db.deleteCompanyProfile(routeParam(req, 'cid'));
				res.json({ ok: true });
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/company-profiles/:cid/default',
		route((req, res) => {
			try {
				res.json(db.setDefaultCompanyProfile(routeParam(req, 'cid')));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get('/api/customers', (_req, res) => {
		res.json(db.listCustomers());
	});

	app.post(
		'/api/customers/number-assign',
		route((_req, res) => {
			try {
				const updated = db.assignMissingCustomerNumbers();
				log.info(`Assigned customer numbers to ${updated.length} customers`);
				res.json({ updated: updated.length, customers: updated });
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/customers',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: unknown; profile?: unknown };
			if (
				typeof body.name !== 'string' ||
				typeof body.profile !== 'object' ||
				!body.profile ||
				Array.isArray(body.profile)
			) {
				res.status(400).json({ error: 'Body needs name and profile' });
				return;
			}
			try {
				res.status(201).json(db.createCustomer(body.name, body.profile as StoredCustomer['profile']));
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get(
		'/api/customers/:cid',
		route((req, res) => {
			const customer = db.getCustomer(routeParam(req, 'cid'));
			if (!customer) {
				res.status(404).json({ error: 'Customer not found' });
				return;
			}
			res.json(customer);
		}),
	);

	app.put(
		'/api/customers/:cid',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: string; profile?: StoredCustomer['profile'] };
			try {
				res.json(db.updateCustomer(routeParam(req, 'cid'), body));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.delete(
		'/api/customers/:cid',
		route((req, res) => {
			try {
				db.deleteCustomer(routeParam(req, 'cid'));
				res.json({ ok: true });
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get('/api/products', (_req, res) => {
		res.json(db.listProducts());
	});

	app.post(
		'/api/products',
		route((req, res) => {
			try {
				res.status(201).json(db.createProduct((req.body ?? {}) as NewProduct));
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get(
		'/api/products/:pid',
		route((req, res) => {
			const product = db.getProduct(routeParam(req, 'pid'));
			if (!product) {
				res.status(404).json({ error: 'Product not found' });
				return;
			}
			res.json(product);
		}),
	);

	app.put(
		'/api/products/:pid',
		route((req, res) => {
			try {
				res.json(db.updateProduct(routeParam(req, 'pid'), (req.body ?? {}) as ProductPatch));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.delete(
		'/api/products/:pid',
		route((req, res) => {
			try {
				db.deleteProduct(routeParam(req, 'pid'));
				res.json({ ok: true });
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.use('/api', (_req, res) => {
		res.status(404).json({ error: 'Unknown API route' });
	});
	app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
		const err = error as { message?: string; status?: number; statusCode?: number };
		// keep body-parser/client errors (400, 413) as they are, hide internals
		const status = err?.status ?? err?.statusCode ?? 500;
		const message = status < 500 ? String(err?.message ?? 'Request failed') : 'Internal server error';
		log.error(`API error (${status}): ${String(err?.message ?? error)}`);
		res.status(status).json({ error: message });
	});

	return app;
}

/**
 * Serves a built PWA directory (www/) on the API app when present.
 *
 * @param app - Express app from createApiServer.
 * @param dir - Absolute path of the PWA bundle directory.
 * @returns True when the directory exists and was mounted.
 */
export function attachStatic(app: Express, dir: string): boolean {
	try {
		if (!existsSync(dir) || !statSync(dir).isDirectory()) {
			return false;
		}
		app.use(express.static(dir));
		return true;
	} catch {
		return false;
	}
}
