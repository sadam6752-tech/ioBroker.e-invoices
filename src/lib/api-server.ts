/**
 * HTTP JSON API for ioBroker.e-invoices (P4a).
 *
 * Pure Express factory — no js-controller needed, fully testable with
 * supertest. main.ts mounts it on the adapter port and serves the PWA.
 * v1 has no auth (LAN trust); token auth follows with the admin config (P6).
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import helmet from 'helmet';
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
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
	defaultDocumentTitle,
	defaultValidUntil,
	isQuote,
	normalizeDocumentType,
	todayIso,
	validateInvoiceForIssue,
	type InvoiceDraftInput,
	type InvoiceStatus,
	ALLOWED_VAT_RATES,
	DEFAULT_NUMBER_FORMAT,
	DEFAULT_QUOTE_NUMBER_FORMAT,
} from './invoice-model';
import {
	issueInvoiceBatch,
	issueInvoiceWithArtifacts,
	collectReminderCandidates,
	rerenderInvoicePdf,
	type ArtifactWriter,
	type IssueLogger,
} from './issue-service';
import { createBackup, previewRestore, restoreBackup } from './backup';
import { attachmentDisposition } from './attachments';
import { renderDatevHead, renderDatevRows, renderInvoiceListCsv } from './csv';
import { renderInvoiceListWorkbook } from './excel';
import { paymentCheckDuty } from './invoice-model';
import { renderInvoicePdf } from './pdf';
import { validateTemplate, type LayoutTemplate } from './templates';
import { validateArtifacts, type ArtifactValidation } from './validation';
import { generateInvoiceXml } from './zugferd';

/**
 * Applies the shared list filter of the API to a query object, so the list
 * view and every export (xlsx, csv, datev) show the same invoices.
 *
 * @param db - Open invoice database.
 * @param query - Express query object.
 * @returns Matching invoices, capped at the export limit.
 */
function filteredInvoices(db: InvoiceDatabase, query: Record<string, unknown>): StoredInvoice[] {
	const status = typeof query.status === 'string' ? (query.status as InvoiceStatus) : undefined;
	const year = typeof query.year === 'string' ? Number(query.year) : undefined;
	const text = typeof query.q === 'string' ? query.q : undefined;
	// R8: the list can be narrowed to quotations or invoices, so an export
	// never mixes A-numbers into the booking list by accident.
	const docType = typeof query.docType === 'string' ? normalizeDocumentType(query.docType) : undefined;
	return db.listInvoices({
		status: status && ['draft', 'issued', 'cancelled'].includes(status) ? status : undefined,
		year: Number.isInteger(year) ? year : undefined,
		docType,
		query: text,
		limit: 500,
	});
}

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
	/**
	 * Requests per minute and client (R3). Defaults are production values,
	 * tests inject small numbers to reach the limit quickly.
	 */
	limits?: { api?: number; restore?: number };
	/** Invoicing defaults from the instance config (read by the PWA). */
	settings?: {
		defaultVatRate: number;
		defaultPaymentTerms: string;
		numberFormat: string;
		quoteNumberFormat: string;
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
	// R8: a preview of a quotation must look like a quotation (title, validity,
	// no retention), otherwise its PDF check would test the wrong rules.
	const docType = normalizeDocumentType(draft.docType);
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
		docType,
		documentTitle: draft.documentTitle ?? defaultDocumentTitle(docType),
		notes: draft.notes ?? null,
		paymentTerms: draft.paymentTerms ?? null,
		employeeCode: draft.employeeCode ?? null,
		skontoPercent: Number(draft.skontoPercent) || 0,
		skontoDueDate: draft.skontoDueDate ?? null,
		validUntil:
			docType === 'quote'
				? draft.validUntil?.trim() || defaultValidUntil(draft.issueDate)
				: (draft.validUntil ?? null),
		sourceDocumentId: draft.sourceDocumentId ?? null,
		acceptedAt: null,
		rejectedAt: null,
		rejectionReason: null,
		sentAt: null,
		sendChannel: null,
		paymentCheck: null,
		paymentCheckedAt: null,
		remindedAt: null,
		reminderLevel: 0,
		retainUntil: null,
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
		// R8: without the type the re-validation would test invoice rules
		// against a quotation (and vice versa).
		docType: invoice.docType,
		validUntil: invoice.validUntil ?? undefined,
		employeeCode: invoice.employeeCode ?? undefined,
		skontoPercent: invoice.skontoPercent,
		skontoDueDate: invoice.skontoDueDate ?? undefined,
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
 * Reads a row id from a route param.
 *
 * @param req - Express request.
 * @param name - Param name.
 * @returns The id, or undefined when the param is not a positive integer.
 */
function routeIdParam(req: Request, name: string): number | undefined {
	const value = Number(routeParam(req, name));
	return Number.isInteger(value) && value > 0 ? value : undefined;
}

/**
 * Stores the outcome of one validation run as a JSON file next to the invoice
 * artifacts and records it in the database (R2). A failing write never fails
 * the validation itself — the response then carries `report: null` and the
 * reason is logged.
 *
 * @param db - Open invoice database.
 * @param storage - Artifact file backend.
 * @param log - Logger.
 * @param invoice - Invoice the report belongs to (draft or issued).
 * @param result - Validation outcome of this run.
 */
async function storeValidationReport(
	db: InvoiceDatabase,
	storage: ArtifactStorage,
	log: IssueLogger,
	invoice: StoredInvoice,
	result: ArtifactValidation,
): Promise<{ seq: number; path: string; createdAt: string } | null> {
	// The running number is owned by the database; the file name just mirrors
	// it, so `…validation-1.json`, `…validation-2.json` stay predictable.
	const seq = db.nextValidationSeq(invoice.id);
	const createdAt = new Date().toISOString();
	const name = invoice.number ?? invoice.id;
	const path = `invoices/${invoice.issueDate.slice(0, 4)}/${name}.validation-${seq}.json`;
	const payload = {
		invoiceId: invoice.id,
		invoiceNumber: invoice.number,
		documentTitle: invoice.documentTitle,
		profile: invoice.profile,
		seq,
		createdAt,
		validator: 'e-invoices internal check (CII XSD offline + EN 16931 plausibility)',
		ok: result.formatErrors.length === 0 && result.businessErrors.length === 0,
		formatErrors: result.formatErrors,
		businessErrors: result.businessErrors,
	};
	try {
		await storage.write(path, JSON.stringify(payload, null, 2));
		db.logValidationReport(invoice.id, path, result.formatErrors.length, result.businessErrors.length);
		log.info(`Validation report stored: ${path}`);
		return { seq, path, createdAt };
	} catch (error) {
		log.error(`Cannot store validation report ${path}: ${(error as Error).message}`);
		return null;
	}
}

/**
 * Compares a provided secret with the configured token without leaking content
 * or length through response timing: both sides are hashed to a fixed size and
 * compared with `timingSafeEqual` (R3).
 *
 * @param provided - Value from the request.
 * @param expected - Configured token including its scheme prefix.
 */
function secretEquals(provided: string, expected: string): boolean {
	const a = createHash('sha256').update(provided, 'utf8').digest();
	const b = createHash('sha256').update(expected, 'utf8').digest();
	return timingSafeEqual(a, b);
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
		// R8: quotations number in their own circle, so the PWA shows the
		// matching format next to the invoice one.
		quoteNumberFormat: deps.settings?.quoteNumberFormat?.trim() || DEFAULT_QUOTE_NUMBER_FORMAT,
		storageMount: deps.settings?.storageMount?.trim() ?? '',
		backupIntervalMinutes: Math.max(0, Math.round(Number(deps.settings?.backupIntervalMinutes) || 0)),
	};
	const limits = {
		api: Math.max(1, Math.round(deps.limits?.api ?? 600)),
		restore: Math.max(1, Math.round(deps.limits?.restore ?? 10)),
	};
	const app = express();
	app.disable('x-powered-by');
	// The adapter listens directly on its own port, so the socket address is the
	// client address; X-Forwarded-* headers from a client must not be trusted.
	app.set('trust proxy', false);
	app.use(
		helmet({
			// The PWA is served from the same origin as the API: everything else
			// (scripts, styles, connections, frames) stays blocked.
			contentSecurityPolicy: {
				directives: {
					// helmet merges its own defaults into this list. One of them,
					// `upgrade-insecure-requests`, has to go: the adapter speaks plain
					// HTTP, and that directive makes the browser rewrite every asset
					// URL to https:// on any origin that is not "trustworthy"
					// (localhost/127.0.0.1 only). A client on the LAN
					// (http://192.168.x.y:8093) therefore requested the JS/CSS over
					// https, got a CORS error and showed a blank start page (0.0.4).
					'upgrade-insecure-requests': null,
					'default-src': ["'self'"],
					'script-src': ["'self'"],
					// the views set inline style attributes (badges, status colors)
					'style-src': ["'self'", "'unsafe-inline'"],
					'img-src': ["'self'", 'data:', 'blob:'],
					'connect-src': ["'self'"],
					'worker-src': ["'self'", 'blob:'],
					'manifest-src': ["'self'"],
					'object-src': ["'none'"],
					'base-uri': ["'self'"],
					'form-action': ["'self'"],
					'frame-ancestors': ["'none'"],
				},
			},
			crossOriginEmbedderPolicy: false,
		}),
	);
	app.use(express.json({ limit: '25mb' }));
	// Rate limits (R3): the API is reachable from the LAN, and a restore replaces
	// the whole database — so restore gets a much smaller budget than the rest.
	const limiter = (limit: number, scope: string): RateLimitRequestHandler =>
		rateLimit({
			windowMs: 60_000,
			limit,
			standardHeaders: 'draft-7',
			legacyHeaders: false,
			handler: (req, res) => {
				// log hygiene: method and path only, never headers or bodies
				log.warn?.(`Rate limit hit (${scope}): ${req.method} ${req.path}`);
				res.status(429).json({ error: 'Too many requests' });
			},
		});
	app.use('/api', limiter(limits.api, 'api'));
	app.use('/api/restore', limiter(limits.restore, 'restore'));
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
			if (req.headers.authorization && secretEquals(req.headers.authorization, `Bearer ${authToken}`)) {
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
			const docType =
				typeof req.query.docType === 'string' ? normalizeDocumentType(req.query.docType) : undefined;
			res.json(db.listInvoices({ status, year, docType, query, limit, offset }));
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
				// R8: the type decides number circle, validation and (no)
				// e-invoice path, so it is normalised before the blank draft is
				// built — a quotation must start with its own title and validity.
				const docType = normalizeDocumentType(typeof input.docType === 'string' ? input.docType : undefined);
				const created = db.createDraft({ ...blankDraft(todayIso(), docType), ...input, docType });
				log.info(`API draft created: ${created.id}`);
				res.status(201).json(created);
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	// Sammel-Export BEFORE /:id — Express :id also matches dots (export.xlsx).
	// Sammel-Exporte BEFORE /:id — Express :id also matches dots, so
	// /api/invoices/export.csv would otherwise be looked up as the invoice
	// "export.csv" and answer 404.
	app.get('/api/invoices/export.csv', (req, res) => {
		res.type('text/csv; charset=utf-8');
		res.set('Content-Disposition', 'attachment; filename="rechnungen.csv"');
		res.send(renderInvoiceListCsv(filteredInvoices(db, req.query)));
	});

	app.get('/api/invoices/export.datev', (req, res) => {
		const company = db.getDefaultCompanyProfile()?.profile;
		const head = renderDatevHead(company?.name ?? 'Firma', company?.taxNumber ?? '');
		res.type('text/plain; charset=iso-8859-1');
		res.set('Content-Disposition', 'attachment; filename="rechnungen.datev"');
		res.send(`${head}\n${renderDatevRows(filteredInvoices(db, req.query))}`);
	});

	app.get('/api/invoices/export.xlsx', (req, res) => {
		const invoices = filteredInvoices(db, req.query);
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

	// R2: the stored validation reports (newest first) and the report files.
	// Registered before /:id, same reason as the artifact downloads above.
	app.get(
		'/api/invoices/:id/validation',
		route((req, res) => {
			const id = routeParam(req, 'id');
			if (!db.getInvoice(id)) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			res.json(db.listValidationReports(id));
		}),
	);

	app.get(
		'/api/invoices/:id/validation/:seq.json',
		route(async (req, res) => {
			const id = routeParam(req, 'id');
			const seq = Number(routeParam(req, 'seq'));
			const report = db.listValidationReports(id).find(entry => entry.seq === seq);
			if (!report) {
				res.status(404).json({ error: 'Validation report not found' });
				return;
			}
			if (!isContainedRelPath(report.reportPath)) {
				res.status(500).json({ error: 'Stored report path is invalid' });
				return;
			}
			try {
				const data = await storage.read(report.reportPath);
				res.type('application/json');
				res.set('Content-Disposition', `attachment; filename="validation-${seq}.json"`);
				res.send(data);
			} catch {
				res.status(404).json({ error: `Artifact file missing: ${report.reportPath}` });
			}
		}),
	);

	// R4: attachments of a draft. Registered before /:id, same reason as the
	// routes above. Listing never returns content (a BLOB is megabytes), the
	// download route below is the one that streams it.
	app.get(
		'/api/invoices/:id/attachments',
		route((req, res) => {
			const id = routeParam(req, 'id');
			if (!db.getInvoice(id)) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			res.json(db.listAttachmentMeta(id));
		}),
	);

	app.post(
		'/api/invoices/:id/attachments',
		route((req, res) => {
			const id = routeParam(req, 'id');
			const body = (req.body ?? {}) as { filename?: unknown; mime?: unknown; dataBase64?: unknown };
			if (typeof body.filename !== 'string' || typeof body.dataBase64 !== 'string') {
				res.status(400).json({ error: 'Body needs filename and dataBase64 (mime is optional)' });
				return;
			}
			// The content decides the type: `attachments.ts` checks size, magic
			// bytes and the agreement with the extension before anything is
			// written, and the database repeats the check for every other caller.
			try {
				const stored = db.addAttachment(id, {
					filename: body.filename,
					mime: typeof body.mime === 'string' ? body.mime : '',
					data: Buffer.from(body.dataBase64, 'base64'),
				});
				log.info(`Attachment stored for ${id}: ${stored.filename} (${stored.size} bytes)`);
				res.status(201).json({
					id: stored.id,
					invoiceId: stored.invoiceId,
					filename: stored.filename,
					mime: stored.mime,
					size: stored.size,
					createdAt: stored.createdAt,
				});
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get(
		'/api/invoices/:id/attachments/:aid',
		route((req, res) => {
			const attachmentId = routeIdParam(req, 'aid');
			if (attachmentId === undefined) {
				res.status(400).json({ error: 'Attachment id must be a positive integer' });
				return;
			}
			const attachment = db.getAttachment(routeParam(req, 'id'), attachmentId);
			if (!attachment) {
				res.status(404).json({ error: 'Attachment not found' });
				return;
			}
			res.type(attachment.mime);
			res.set('Content-Disposition', attachmentDisposition(attachment.filename));
			res.send(attachment.data);
		}),
	);

	app.delete(
		'/api/invoices/:id/attachments/:aid',
		route((req, res) => {
			const attachmentId = routeIdParam(req, 'aid');
			if (attachmentId === undefined) {
				res.status(400).json({ error: 'Attachment id must be a positive integer' });
				return;
			}
			try {
				db.deleteAttachment(routeParam(req, 'id'), attachmentId);
				res.status(204).end();
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
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

	// R8: quotation lifecycle. The routes stay in the invoice collection — the
	// docType on the record decides whether they make sense, and the database
	// refuses anything else (a decision on an invoice, a conversion of one).
	app.post(
		'/api/invoices/:id/quote-accept',
		route((req, res) => {
			const body = (req.body ?? {}) as { at?: unknown };
			if (body.at !== undefined && typeof body.at !== 'string') {
				res.status(400).json({ error: 'at must be an ISO timestamp' });
				return;
			}
			try {
				const updated = db.setQuoteDecision(routeParam(req, 'id'), 'accepted', {
					at: typeof body.at === 'string' ? body.at : undefined,
				});
				log.info(`Quotation accepted: ${updated.number} (${updated.id})`);
				res.json(updated);
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/quote-reject',
		route((req, res) => {
			const body = (req.body ?? {}) as { at?: unknown; reason?: unknown };
			if (body.at !== undefined && typeof body.at !== 'string') {
				res.status(400).json({ error: 'at must be an ISO timestamp' });
				return;
			}
			if (body.reason !== undefined && typeof body.reason !== 'string') {
				res.status(400).json({ error: 'reason must be a string' });
				return;
			}
			try {
				const updated = db.setQuoteDecision(routeParam(req, 'id'), 'rejected', {
					at: typeof body.at === 'string' ? body.at : undefined,
					reason: typeof body.reason === 'string' ? body.reason : undefined,
				});
				log.info(`Quotation rejected: ${updated.number} (${updated.id})`);
				res.json(updated);
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/convert',
		route((req, res) => {
			const body = (req.body ?? {}) as { requireAccepted?: unknown } & Partial<InvoiceDraftInput>;
			if (body.requireAccepted !== undefined && typeof body.requireAccepted !== 'boolean') {
				res.status(400).json({ error: 'requireAccepted must be a boolean' });
				return;
			}
			const bad = findShapeError(body, { seller: 'object', buyer: 'object', lines: 'array' });
			if (bad) {
				res.status(400).json({ error: bad });
				return;
			}
			// Accepted by default: the recorded "Ja" of the customer is the
			// paper trail behind the invoice. An explicit `requireAccepted:
			// false` covers the deal that was agreed by phone and never
			// marked in the adapter.
			const { requireAccepted, ...patch } = body;
			try {
				const created = db.convertQuoteToInvoice(routeParam(req, 'id'), patch, {
					requireAccepted: requireAccepted !== false,
				});
				log.info(`Quotation ${routeParam(req, 'id')} converted to draft ${created.id}`);
				res.status(201).json(created);
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

	app.delete(
		'/api/invoices/:id',
		route((req, res) => {
			const id = routeParam(req, 'id');
			try {
				db.deleteDraft(id);
				res.status(204).end();
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/issue-batch',
		route(async (req, res) => {
			const body = (req.body ?? {}) as { ids?: unknown };
			const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === 'string') : [];
			if (ids.length === 0) {
				res.status(400).json({ error: 'ids must be a non-empty array' });
				return;
			}
			if (ids.length > 200) {
				res.status(400).json({ error: 'At most 200 drafts per run' });
				return;
			}
			try {
				const outcome = await issueInvoiceBatch(db, log, ids, storage);
				res.json(outcome);
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/sent',
		route((req, res) => {
			const body = (req.body ?? {}) as { channel?: unknown; sentAt?: unknown };
			const channel = typeof body.channel === 'string' && body.channel.trim() ? body.channel.trim() : 'E-Mail';
			// Only accept a plain ISO timestamp, never arbitrary text.
			const sentAt =
				typeof body.sentAt === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(body.sentAt)
					? new Date(body.sentAt).toISOString()
					: new Date().toISOString();
			try {
				res.json(db.markSent(routeParam(req, 'id'), sentAt, channel));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/payment-check',
		route((req, res) => {
			const id = routeParam(req, 'id');
			const invoice = db.getInvoice(id);
			if (!invoice) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			const duty = paymentCheckDuty(invoice.dueDate, invoice.totals.grossTotal);
			const body = (req.body ?? {}) as { outcome?: unknown };
			if (typeof body.outcome === 'string' && body.outcome.trim()) {
				res.json({
					invoice: db.setPaymentCheck(id, body.outcome.trim()),
					duty,
					checked: true,
				});
				return;
			}
			// Without an explicit outcome the endpoint only reports the duty, so
			// the UI can show it before the user decides.
			res.json({ invoice, duty, checked: Boolean(invoice.paymentCheckedAt) });
		}),
	);

	app.get(
		'/api/reminders',
		route((_req, res) => {
			res.json(collectReminderCandidates(db));
		}),
	);

	app.post(
		'/api/invoices/:id/reminded',
		route((req, res) => {
			try {
				res.json(db.registerReminder(routeParam(req, 'id')));
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.get(
		'/api/invoice-templates',
		route((_req, res) => {
			res.json(db.listInvoiceTemplates());
		}),
	);

	app.post(
		'/api/invoice-templates',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: unknown; body?: unknown };
			if (typeof body.name !== 'string' || !body.name.trim()) {
				res.status(400).json({ error: 'name is required' });
				return;
			}
			if (typeof body.body !== 'object' || body.body === null) {
				res.status(400).json({ error: 'body is required' });
				return;
			}
			try {
				res.status(201).json(db.createInvoiceTemplate(body.name, body.body as InvoiceDraftInput));
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
			}
		}),
	);

	app.put(
		'/api/invoice-templates/:id',
		route((req, res) => {
			const body = (req.body ?? {}) as { name?: unknown; body?: unknown };
			try {
				res.json(
					db.updateInvoiceTemplate(routeParam(req, 'id'), {
						name: typeof body.name === 'string' ? body.name : undefined,
						body: (body.body ?? undefined) as InvoiceDraftInput | undefined,
					}),
				);
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.delete(
		'/api/invoice-templates/:id',
		route((req, res) => {
			try {
				db.deleteInvoiceTemplate(routeParam(req, 'id'));
				res.status(204).end();
			} catch (error) {
				res.status(isMissingError(error) ? 404 : 400).json({ error: (error as Error).message });
			}
		}),
	);

	app.post(
		'/api/invoices/:id/as-template',
		route((req, res) => {
			const invoice = db.getInvoice(routeParam(req, 'id'));
			if (!invoice) {
				res.status(404).json({ error: 'Invoice not found' });
				return;
			}
			const body = (req.body ?? {}) as { name?: unknown };
			const name = typeof body.name === 'string' ? body.name.trim() : '';
			if (!name) {
				res.status(400).json({ error: 'name is required' });
				return;
			}
			// Only the content is copied. The customer, the number and the dates
			// belong to the single invoice and must not leak into the template.
			try {
				res.status(201).json(
					db.createInvoiceTemplate(name, {
						seller: invoice.seller,
						// a placeholder the user replaces per invoice (BT-10 is mandatory)
						buyer: invoice.buyer,
						lines: invoice.lines,
						issueDate: invoice.issueDate,
						deliveryDate: invoice.deliveryDate,
						dueDate: invoice.dueDate ?? undefined,
						currency: 'EUR',
						documentTitle: invoice.documentTitle,
						notes: invoice.notes ?? undefined,
						paymentTerms: invoice.paymentTerms ?? undefined,
						skontoPercent: Number(invoice.skontoPercent) || 0,
						skontoDueDate: invoice.skontoDueDate ?? undefined,
						employeeCode: invoice.employeeCode ?? undefined,
					}),
				);
			} catch (error) {
				res.status(400).json({ error: (error as Error).message });
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
			let result: ArtifactValidation;
			if (businessErrors.length > 0) {
				// Nothing to hand to the XSD check yet: the Pflichtangaben are
				// incomplete, so only the business layer has findings.
				result = { formatErrors: [], businessErrors };
			} else if (isQuote(invoice.docType)) {
				// R8: a quotation is not an e-invoice. There is no CII XML to
				// check against EN 16931, so the business layer is the whole
				// validation and the report stays honest about it.
				result = { formatErrors: [], businessErrors: [] };
			} else {
				try {
					const preview = previewInvoice(draft);
					const { xml } = await generateInvoiceXml(preview);
					result = await validateArtifacts(preview, xml);
				} catch (error) {
					result = { formatErrors: [(error as Error).message], businessErrors };
				}
			}
			const report = await storeValidationReport(db, storage, log, invoice, result);
			res.json({ ...result, report });
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
		'/api/restore/preview',
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
				try {
					data = await storage.read(`backups/${body.filename.split('/').pop() ?? ''}`);
				} catch {
					res.status(404).json({ error: 'Backup file not found' });
					return;
				}
			} else {
				res.status(400).json({ error: 'filename or dataBase64 is required' });
				return;
			}
			// A restore replaces the whole database, so the user sees the
			// effect before anything is written.
			res.json(await previewRestore(db, data));
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

	app.get('/api/customers', (req, res) => {
		// ?q= drives the fuzzy search: the picker stays usable with typos.
		const query = typeof req.query.q === 'string' ? req.query.q : undefined;
		res.json(db.listCustomers(query));
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
 * Besides the plain static files this answers the browser's implicit
 * `/favicon.ico` request, which would otherwise log a 404 on every load of the
 * start page (no `www/favicon.ico` is shipped).
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
		// Browsers ask for /favicon.ico on the origin root even when the page
		// links its own icon. Fall back to the PWA icon (browsers accept a PNG
		// payload) unless the bundle ships a real favicon.ico.
		app.get('/favicon.ico', (_req, res) => {
			const ico = join(dir, 'favicon.ico');
			const png = join(dir, 'icons', 'icon-192.png');
			if (existsSync(ico)) {
				res.type('image/x-icon').sendFile(ico);
				return;
			}
			if (existsSync(png)) {
				res.type('image/png').sendFile(png);
				return;
			}
			res.status(404).end();
		});
		return true;
	} catch {
		return false;
	}
}
