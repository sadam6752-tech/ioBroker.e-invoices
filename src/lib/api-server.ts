/**
 * HTTP JSON API for ioBroker.e-invoices (P4a).
 *
 * Pure Express factory — no js-controller needed, fully testable with
 * supertest. main.ts mounts it on the adapter port and serves the PWA.
 * v1 has no auth (LAN trust); token auth follows with the admin config (P6).
 */
import express, { type Express, type Request, type Response } from 'express';
import { existsSync, statSync } from 'node:fs';
import type { InvoiceDatabase, StoredInvoice } from './db';
import {
	blankDraft,
	calcTotals,
	validateInvoiceForIssue,
	type InvoiceDraftInput,
	type InvoiceStatus,
} from './invoice-model';
import { issueInvoiceWithArtifacts, type ArtifactWriter, type IssueLogger } from './issue-service';
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
	const app = express();
	app.disable('x-powered-by');
	app.use(express.json({ limit: '25mb' }));

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
			if (typeof input !== 'object' || !input.seller || !input.buyer || !Array.isArray(input.lines)) {
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
			res.type('application/xml').send(invoice.xml);
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
				res.type('application/pdf').send(data);
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

	app.patch(
		'/api/invoices/:id',
		route((req, res) => {
			try {
				res.json(db.updateDraft(routeParam(req, 'id'), (req.body ?? {}) as Partial<InvoiceDraftInput>));
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
			const body = (req.body ?? {}) as { definition?: unknown };
			const errors = validateTemplate(body.definition);
			if (errors.length > 0) {
				res.status(400).json({ error: errors.join(' | ') });
				return;
			}
			const definition = body.definition as LayoutTemplate;
			const sample = previewInvoice({
				seller: {
					name: 'Muster GmbH',
					street: 'Beispielstr. 1',
					zip: '10115',
					city: 'Berlin',
					country: 'DE',
					vatId: 'DE123456789',
					iban: 'DE02120300000000202051',
					email: 'rechnung@muster.example',
				},
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
			if (definition.logo?.path) {
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

	app.use('/api', (_req, res) => {
		res.status(404).json({ error: 'Unknown API route' });
	});
	app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
		log.error(`API error: ${(error as Error).message}`);
		res.status(500).json({ error: 'Internal server error' });
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
