/**
 * SQLite persistence for ioBroker.e-invoices (P1).
 *
 * Engine: better-sqlite3 (sync API), WAL mode, versioned migrations.
 * Stores drafts + issued invoices, per-year counters, attachments,
 * company profiles, layout templates and the backup log.
 * Binary files (PDF/XML/XLSX/logos) live in the ioBroker file mount —
 * only their paths/hashes are stored here.
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
	calcTotals,
	formatInvoiceNumber,
	normalizeEmployeeCode,
	validateInvoiceForIssue,
	type InvoiceDraftInput,
	type InvoiceStatus,
	type InvoiceTotals,
	type Party,
} from './invoice-model';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';
import { DEFAULT_TEMPLATE, validateTemplate, type LayoutTemplate } from './templates';

/** Stored invoice row mapped to objects. */
export interface StoredInvoice {
	/** Row UUID. */
	id: string;
	/** Issue number (YYYY-NNNN), null while draft. */
	number: string | null;
	/** Issue date ISO YYYY-MM-DD. */
	issueDate: string;
	/** Delivery/service date or period. */
	deliveryDate: string;
	/** Payment due date, may be null. */
	dueDate: string | null;
	/** Seller party snapshot. */
	seller: InvoiceDraftInput['seller'];
	/** Buyer party snapshot. */
	buyer: InvoiceDraftInput['buyer'];
	/** Line items snapshot. */
	lines: InvoiceDraftInput['lines'];
	/** Computed totals snapshot. */
	totals: InvoiceTotals;
	/** ZUGFeRD profile used. */
	profile: string;
	/** Lifecycle status. */
	status: InvoiceStatus;
	/** Layout template id, null until artifacts attached. */
	templateId: string | null;
	/** Document title (Rechnung/Gutschrift/...). */
	documentTitle: string;
	/** Free notes, may be null. */
	notes: string | null;
	/** Employee code used in the number (e.g. `01`), may be null for legacy. */
	employeeCode: string | null;
	/** Payment terms text, may be null. */
	paymentTerms: string | null;
	/** Structured XML, null until generated. */
	xml: string | null;
	/** Mount path of the hybrid PDF, null until generated. */
	pdfPath: string | null;
	/** Mount path of the Excel copy, may be null. */
	xlsxPath: string | null;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

/** Generated output attached to an issued invoice. */
export interface IssueArtifacts {
	/** Structured EN 16931 XML string. */
	xml: string;
	/** Mount path of the hybrid PDF. */
	pdfPath: string;
	/** Mount path of the Excel copy (optional). */
	xlsxPath?: string;
	/** Layout template id (optional). */
	templateId?: string | null;
}

/** List filter for invoices. */
export interface InvoiceFilter {
	/** Filter by lifecycle status. */
	status?: InvoiceStatus;
	/** Filter by issue year. */
	year?: number;
	/** Free-text search over number and parties. */
	query?: string;
	/** Page size 1-500, default 50. */
	limit?: number;
	/** Page offset, default 0. */
	offset?: number;
}

function nowIso(): string {
	return new Date().toISOString();
}

function parseJson<T>(value: string, label: string): T {
	try {
		return JSON.parse(value) as T;
	} catch {
		throw new Error(`Corrupt ${label} JSON in database`);
	}
}

interface InvoiceRow {
	id: string;
	number: string | null;
	issue_date: string;
	delivery_date: string;
	due_date: string | null;
	seller_json: string;
	buyer_json: string;
	lines_json: string;
	totals_json: string;
	profile: string;
	status: string;
	template_id: string | null;
	document_title: string;
	notes: string | null;
	employee_code: string | null;
	payment_terms: string | null;
	xml: string | null;
	pdf_path: string | null;
	xlsx_path: string | null;
	created_at: string;
	updated_at: string;
}

function mapRow(row: InvoiceRow): StoredInvoice {
	return {
		id: row.id,
		number: row.number,
		issueDate: row.issue_date,
		deliveryDate: row.delivery_date,
		dueDate: row.due_date,
		seller: parseJson(row.seller_json, 'seller'),
		buyer: parseJson(row.buyer_json, 'buyer'),
		lines: parseJson(row.lines_json, 'lines'),
		totals: parseJson(row.totals_json, 'totals'),
		profile: row.profile,
		status: row.status as InvoiceStatus,
		templateId: row.template_id,
		documentTitle: row.document_title,
		notes: row.notes,
		employeeCode: row.employee_code ?? null,
		paymentTerms: row.payment_terms ?? null,
		xml: row.xml,
		pdfPath: row.pdf_path,
		xlsxPath: row.xlsx_path,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** Stored layout template row mapped to objects. */
export interface StoredTemplate {
	/** Template UUID. */
	id: string;
	/** Display name. */
	name: string;
	/** Version, bumped on every update. */
	version: number;
	/** Layout definition. */
	definition: LayoutTemplate;
	/** True for the default template. */
	isDefault: boolean;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

/** Partial template update. */
export interface TemplatePatch {
	/** New display name. */
	name?: string;
	/** New layout definition. */
	definition?: LayoutTemplate;
}

interface TemplateRow {
	id: string;
	name: string;
	version: number;
	definition_json: string;
	is_default: number;
	created_at: string;
	updated_at: string;
}

function mapTemplateRow(row: TemplateRow): StoredTemplate {
	return {
		id: row.id,
		name: row.name,
		version: row.version,
		definition: parseJson(row.definition_json, 'template'),
		isDefault: row.is_default === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** New file attachment content. */
export interface NewAttachment {
	/** Original filename. */
	filename: string;
	/** MIME type. */
	mime: string;
	/** File content. */
	data: Buffer;
}

/** Backup log entry content. */
export interface BackupLogEntry {
	/** ZIP filename in the mountpoint. */
	filename: string;
	/** ZIP size in bytes. */
	size: number;
	/** SHA-256 of the ZIP. */
	sha256: string;
	/** Manifest JSON. */
	manifestJson: string;
}
/** Stored file attachment of an invoice. */
export interface StoredAttachment {
	/** Row id. */
	id: number;
	/** Owning invoice UUID. */
	invoiceId: string;
	/** Original filename. */
	filename: string;
	/** MIME type. */
	mime: string;
	/** Size in bytes. */
	size: number;
	/** File content. */
	data: Buffer;
	/** Creation timestamp. */
	createdAt: string;
}

/** Year counter scoped by employee. */
export interface YearCounter {
	/** Calendar year. */
	year: number;
	/** Employee code. */
	employee: string;
	/** Last sequence used. */
	last_seq: number;
}

/** Stored company (seller) profile. */
export interface StoredCompanyProfile {
	/** Profile UUID. */
	id: string;
	/** Display name. */
	name: string;
	/** Seller party data. */
	profile: Party;
	/** True for the default profile. */
	isDefault: boolean;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

interface CompanyRow {
	id: string;
	name: string;
	profile_json: string;
	is_default: number;
	created_at: string;
	updated_at: string;
}

function mapCompanyRow(row: CompanyRow): StoredCompanyProfile {
	return {
		id: row.id,
		name: row.name,
		profile: parseJson(row.profile_json, 'company'),
		isDefault: row.is_default === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** Partial company profile update. */
export interface CompanyPatch {
	/** New display name. */
	name?: string;
	/** New seller party data. */
	profile?: Party;
}

/** Partial customer update. */
export interface CustomerPatch {
	/** New display name. */
	name?: string;
	/** New buyer party data. */
	profile?: Party;
}

/** Stored customer (buyer) profile. */
export interface StoredCustomer {
	/** Profile UUID. */
	id: string;
	/** Display name. */
	name: string;
	/** Buyer party data. */
	profile: Party;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

interface CustomerRow {
	id: string;
	name: string;
	profile_json: string;
	created_at: string;
	updated_at: string;
}

function mapCustomerRow(row: CustomerRow): StoredCustomer {
	return {
		id: row.id,
		name: row.name,
		profile: parseJson(row.profile_json, 'customer'),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** Stored product/service catalog item. */
export interface StoredProduct {
	/** Item UUID. */
	id: string;
	/** Article number. */
	sku: string;
	/** Description. */
	name: string;
	/** Detail text. */
	details: string;
	/** Unit. */
	unit: string;
	/** Net unit price in EUR. */
	unitPriceNet: number;
	/** VAT rate in percent. */
	vatRate: number;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

/** New catalog item content. */
export interface NewProduct {
	/** Article number. */
	sku?: string;
	/** Description (required). */
	name: string;
	/** Detail text. */
	details?: string;
	/** Unit. */
	unit?: string;
	/** Net unit price in EUR. */
	unitPriceNet?: number;
	/** VAT rate in percent. */
	vatRate?: number;
}

interface ProductRow {
	id: string;
	sku: string;
	name: string;
	details: string;
	unit: string;
	unit_price_net: number;
	vat_rate: number;
	created_at: string;
	updated_at: string;
}

function mapProductRow(row: ProductRow): StoredProduct {
	return {
		id: row.id,
		sku: row.sku,
		name: row.name,
		details: row.details,
		unit: row.unit,
		unitPriceNet: row.unit_price_net,
		vatRate: row.vat_rate,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** Partial catalog item update. */
export interface ProductPatch {
	/** Article number. */
	sku?: string;
	/** Description. */
	name?: string;
	/** Detail text. */
	details?: string;
	/** Unit. */
	unit?: string;
	/** Net unit price in EUR. */
	unitPriceNet?: number;
	/** VAT rate in percent. */
	vatRate?: number;
}

/** Full database content for backup/restore. */
export interface DatabaseDump {
	/** Dump format version, always 1. */
	formatVersion: 1;
	/** Export timestamp. */
	exportedAt: string;
	/** Schema version at export. */
	schemaVersion: number;
	/** All invoices with snapshots and XML. */
	invoices: StoredInvoice[];
	/** Year counters scoped by employee. */
	counters: YearCounter[];
	/** All layout templates. */
	templates: StoredTemplate[];
	/** All attachments. */
	attachments: StoredAttachment[];
	/** All company profiles. */
	companies: StoredCompanyProfile[];
	/** All customers. */
	customers: StoredCustomer[];
	/** All catalog products. */
	products: StoredProduct[];
}

/** Backup log entry. */
export interface StoredBackup {
	/** Entry UUID. */
	id: string;
	/** Creation timestamp. */
	createdAt: string;
	/** ZIP filename in the mountpoint. */
	filename: string;
	/** ZIP size in bytes. */
	size: number;
	/** SHA-256 of the ZIP. */
	sha256: string;
	/** Manifest JSON. */
	manifestJson: string;
}

/**
 * Invoice database with atomic numbering and migrations.
 */
export class InvoiceDatabase {
	private readonly db: Database.Database;

	/**
	 * Opens (and creates) the SQLite file.
	 *
	 * @param dbPath - Absolute path to `invoices.db`.
	 */
	public constructor(dbPath: string) {
		mkdirSync(dirname(dbPath), { recursive: true });
		this.db = new Database(dbPath);
		this.db.pragma('journal_mode = WAL');
		this.db.pragma('foreign_keys = ON');
		this.db.pragma('busy_timeout = 5000');
	}

	/** Closes the database handle. */
	public close(): void {
		this.db.close();
	}

	/**
	 * Lists column names of a table (schema introspection for tests/migrations).
	 *
	 * @param table - Table name.
	 */
	public tableColumns(table: string): string[] {
		const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
		return rows.map(row => row.name);
	}

	/** Current applied schema version (0 when fresh). */
	public currentVersion(): number {
		const row = this.db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`)
			.get() as { name?: string } | undefined;
		if (!row) {
			return 0;
		}
		const max = this.db.prepare(`SELECT MAX(version) AS v FROM schema_migrations`).get() as {
			v: number | null;
		};
		return max.v ?? 0;
	}

	/**
	 * Applies all pending migrations in order, each in its own transaction.
	 */
	public migrate(): void {
		const current = this.currentVersion();
		for (const migration of MIGRATIONS) {
			if (migration.version <= current) {
				continue;
			}
			const apply = this.db.transaction(() => {
				for (const statement of migration.sql) {
					this.db.exec(statement);
				}
				this.db
					.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`)
					.run(migration.version, migration.name, nowIso());
			});
			apply();
		}
		if (this.currentVersion() !== LATEST_SCHEMA_VERSION) {
			throw new Error('Migration did not reach latest schema version');
		}
	}

	/**
	 * Reserves the next invoice number for a year+employee atomically
	 * (`YYYY-EE-NNN`).
	 *
	 * @param year - Calendar year, e.g. 2026.
	 * @param employee - Employee code, defaults to `00`.
	 */
	public nextInvoiceNumber(year: number, employee?: string): string {
		if (!Number.isInteger(year) || year < 2000 || year > 2100) {
			throw new Error(`Invalid year: ${year}`);
		}
		const code = normalizeEmployeeCode(employee);
		const run = this.db.transaction((): string => {
			const row = this.db
				.prepare(`SELECT last_seq AS seq FROM counters WHERE year = ? AND employee = ?`)
				.get(year, code) as {
				seq?: number;
			} | null;
			const next = (row?.seq ?? 0) + 1;
			this.db
				.prepare(
					`INSERT INTO counters (year, employee, last_seq) VALUES (?, ?, ?)
					ON CONFLICT(year, employee) DO UPDATE SET last_seq = excluded.last_seq`,
				)
				.run(year, code, next);
			return formatInvoiceNumber(year, code, next);
		});
		return run();
	}

	/**
	 * Creates a new draft (may be incomplete; validation happens at issue).
	 *
	 * @param input - Draft content.
	 */
	public createDraft(input: InvoiceDraftInput): StoredInvoice {
		const id = randomUUID();
		const stamp = nowIso();
		const totals = calcTotals(input.lines.length > 0 ? input.lines : []);
		this.db
			.prepare(
				`INSERT INTO invoices
				(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json, profile, status, template_id, document_title, notes, payment_terms, employee_code, created_at, updated_at)
				VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'EN16931', 'draft', NULL, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				id,
				input.issueDate,
				input.deliveryDate,
				input.dueDate ?? null,
				JSON.stringify(input.seller),
				JSON.stringify(input.buyer),
				JSON.stringify(input.lines),
				JSON.stringify(totals),
				input.documentTitle ?? 'Rechnung',
				input.notes ?? null,
				input.paymentTerms ?? null,
				input.employeeCode?.trim() ? input.employeeCode.trim().toUpperCase() : null,
				stamp,
				stamp,
			);
		const created = this.getInvoice(id);
		if (!created) {
			throw new Error('Draft was not stored');
		}
		return created;
	}

	/**
	 * Loads one invoice by id.
	 *
	 * @param id - Invoice UUID.
	 */
	public getInvoice(id: string): StoredInvoice | null {
		const row = this.db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id) as InvoiceRow | undefined;
		return row ? mapRow(row) : null;
	}

	/**
	 * Lists invoices newest first with optional filters.
	 *
	 * @param filter - Status/year/search/pagination filter.
	 */
	public listInvoices(filter: InvoiceFilter = {}): StoredInvoice[] {
		const where: string[] = [];
		const params: (string | number)[] = [];
		if (filter.status) {
			where.push(`status = ?`);
			params.push(filter.status);
		}
		if (filter.year) {
			where.push(`substr(issue_date, 1, 4) = ?`);
			params.push(String(filter.year));
		}
		if (filter.query) {
			where.push(`(number LIKE ? OR buyer_json LIKE ? OR seller_json LIKE ?)`);
			const like = `%${filter.query}%`;
			params.push(like, like, like);
		}
		const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
		const offset = Math.max(filter.offset ?? 0, 0);
		const rows = this.db
			.prepare(
				`SELECT * FROM invoices ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
			)
			.all(...params, limit, offset) as InvoiceRow[];
		return rows.map(mapRow);
	}

	/**
	 * Updates a draft; issued/cancelled invoices are immutable.
	 *
	 * @param id - Invoice UUID.
	 * @param patch - Partial draft content.
	 */
	public updateDraft(id: string, patch: Partial<InvoiceDraftInput>): StoredInvoice {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status !== 'draft') {
			throw new Error('Only drafts can be edited; issued invoices need a correction invoice.');
		}
		const merged: InvoiceDraftInput = {
			seller: patch.seller ?? current.seller,
			buyer: patch.buyer ?? current.buyer,
			lines: patch.lines ?? current.lines,
			issueDate: patch.issueDate ?? current.issueDate,
			deliveryDate: patch.deliveryDate ?? current.deliveryDate,
			dueDate: patch.dueDate ?? current.dueDate ?? undefined,
			currency: 'EUR',
			employeeCode: patch.employeeCode ?? current.employeeCode ?? undefined,
			paymentTerms: patch.paymentTerms ?? current.paymentTerms ?? undefined,
			documentTitle: patch.documentTitle ?? current.documentTitle,
			notes: patch.notes ?? current.notes ?? undefined,
		};
		const totals = calcTotals(merged.lines.length > 0 ? merged.lines : []);
		this.db
			.prepare(
				`UPDATE invoices SET issue_date = ?, delivery_date = ?, due_date = ?, seller_json = ?, buyer_json = ?,
				lines_json = ?, totals_json = ?, document_title = ?, notes = ?, payment_terms = ?, employee_code = ?, updated_at = ? WHERE id = ?`,
			)
			.run(
				merged.issueDate,
				merged.deliveryDate,
				merged.dueDate ?? null,
				JSON.stringify(merged.seller),
				JSON.stringify(merged.buyer),
				JSON.stringify(merged.lines),
				JSON.stringify(totals),
				merged.documentTitle ?? 'Rechnung',
				merged.notes ?? null,
				merged.paymentTerms ?? null,
				merged.employeeCode?.trim() ? merged.employeeCode.trim().toUpperCase() : null,
				nowIso(),
				id,
			);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error('Draft update failed');
		}
		return updated;
	}

	/**
	 * Issues a draft: validates Pflichtangaben, assigns the next number
	 * (`YYYY-EE-NNN` from issue year + employee code) atomically and
	 * freezes the record. File paths are attached later
	 * by the P2/P3 generation step via attachIssueArtifacts().
	 *
	 * @param id - Draft UUID.
	 */
	public issueDraft(id: string): StoredInvoice {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status !== 'draft') {
			throw new Error('Only drafts can be issued.');
		}
		const year = Number(current.issueDate.slice(0, 4));
		if (!Number.isInteger(year)) {
			throw new Error(`Invalid issue year in ${current.issueDate}`);
		}
		const errors = validateInvoiceForIssue({
			seller: current.seller,
			buyer: current.buyer,
			lines: current.lines,
			issueDate: current.issueDate,
			deliveryDate: current.deliveryDate,
			dueDate: current.dueDate ?? undefined,
			currency: 'EUR',
			employeeCode: current.employeeCode ?? undefined,
			documentTitle: current.documentTitle,
			notes: current.notes ?? undefined,
		});
		if (errors.length > 0) {
			throw new Error(`Invoice not issuable: ${errors.join(' | ')}`);
		}
		const run = this.db.transaction((): StoredInvoice => {
			const number = this.nextInvoiceNumber(year, current.employeeCode ?? undefined);
			// Refresh the totals snapshot so a draft saved under older rounding
			// rules can never be frozen with stale figures.
			this.db
				.prepare(
					`UPDATE invoices SET number = ?, status = 'issued', totals_json = ?, updated_at = ? WHERE id = ? AND status = 'draft'`,
				)
				.run(number, JSON.stringify(calcTotals(current.lines)), nowIso(), id);
			const issued = this.getInvoice(id);
			if (!issued || issued.number !== number) {
				throw new Error('Issue transaction failed');
			}
			return issued;
		});
		return run();
	}

	/**
	 * Attaches generated artifacts (XML string + file paths) to an issued invoice.
	 *
	 * @param id - Issued invoice UUID.
	 * @param artifacts - Generated output (XML plus file paths).
	 */
	public attachIssueArtifacts(id: string, artifacts: IssueArtifacts): StoredInvoice {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status !== 'issued') {
			throw new Error('Artifacts can only be attached to issued invoices.');
		}
		this.db
			.prepare(
				`UPDATE invoices SET xml = ?, pdf_path = ?, xlsx_path = ?, template_id = ?, updated_at = ? WHERE id = ?`,
			)
			.run(
				artifacts.xml,
				artifacts.pdfPath,
				artifacts.xlsxPath ?? null,
				artifacts.templateId ?? null,
				nowIso(),
				id,
			);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error('Artifact update failed');
		}
		return updated;
	}

	/**
	 * Cancels an issued invoice (placeholder for Storno; credit notes in P2).
	 *
	 * @param id - Issued invoice UUID.
	 */
	public cancelInvoice(id: string): StoredInvoice {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status !== 'issued') {
			throw new Error('Only issued invoices can be cancelled.');
		}
		this.db.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(nowIso(), id);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error('Cancel failed');
		}
		return updated;
	}

	/**
	 * Counts invoices per status (dashboard).
	 */
	public countByStatus(): Record<InvoiceStatus, number> {
		const rows = this.db.prepare(`SELECT status, COUNT(*) AS n FROM invoices GROUP BY status`).all() as {
			status: string;
			n: number;
		}[];
		const result: Record<InvoiceStatus, number> = { draft: 0, issued: 0, cancelled: 0 };
		for (const row of rows) {
			if (row.status === 'draft' || row.status === 'issued' || row.status === 'cancelled') {
				result[row.status] = row.n;
			}
		}
		return result;
	}

	/**
	 * Creates a layout template (validated by the Pflichtfeld-Wächter).
	 *
	 * @param name - Display name.
	 * @param definition - Layout definition.
	 */
	public createTemplate(name: string, definition: LayoutTemplate): StoredTemplate {
		const errors = validateTemplate({ ...definition, name });
		if (errors.length > 0) {
			throw new Error(`Invalid template: ${errors.join(' | ')}`);
		}
		const id = randomUUID();
		const stamp = nowIso();
		const hasAny = (this.db.prepare(`SELECT COUNT(*) AS n FROM templates`).get() as { n: number }).n > 0;
		this.db
			.prepare(
				`INSERT INTO templates (id, name, version, definition_json, is_default, created_at, updated_at)
				VALUES (?, ?, 1, ?, ?, ?, ?)`,
			)
			.run(id, name.trim(), JSON.stringify({ ...definition, name: name.trim() }), hasAny ? 0 : 1, stamp, stamp);
		const created = this.getTemplate(id);
		if (!created) {
			throw new Error('Template was not stored');
		}
		return created;
	}

	/**
	 * Loads one template by id.
	 *
	 * @param id - Template UUID.
	 */
	public getTemplate(id: string): StoredTemplate | null {
		const row = this.db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id) as TemplateRow | undefined;
		return row ? mapTemplateRow(row) : null;
	}

	/**
	 * Lists templates, default first, then by name.
	 */
	public listTemplates(): StoredTemplate[] {
		const rows = this.db
			.prepare(`SELECT * FROM templates ORDER BY is_default DESC, name ASC`)
			.all() as TemplateRow[];
		return rows.map(mapTemplateRow);
	}

	/**
	 * Returns the default template, if any.
	 */
	public getDefaultTemplate(): StoredTemplate | null {
		const row = this.db.prepare(`SELECT * FROM templates WHERE is_default = 1 LIMIT 1`).get() as
			TemplateRow | undefined;
		return row ? mapTemplateRow(row) : null;
	}

	/**
	 * Creates the default template on first start (idempotent).
	 */
	public ensureDefaultTemplate(): StoredTemplate {
		const existing = this.getDefaultTemplate();
		if (existing) {
			return existing;
		}
		if (this.listTemplates().length === 0) {
			return this.createTemplate(DEFAULT_TEMPLATE.name, DEFAULT_TEMPLATE);
		}
		const first = this.listTemplates()[0];
		this.setDefaultTemplate(first.id);
		const updated = this.getDefaultTemplate();
		if (!updated) {
			throw new Error('Default template setup failed');
		}
		return updated;
	}

	/**
	 * Updates name/definition (bumps version, revalidates).
	 *
	 * @param id - Template UUID.
	 * @param patch - Partial update.
	 */
	public updateTemplate(id: string, patch: TemplatePatch): StoredTemplate {
		const current = this.getTemplate(id);
		if (!current) {
			throw new Error(`Template not found: ${id}`);
		}
		const nextName = patch.name?.trim() || current.name;
		const next = {
			...current.definition,
			...(patch.definition ?? {}),
			name: patch.definition?.name?.trim() || nextName,
		};
		const errors = validateTemplate(next);
		if (errors.length > 0) {
			throw new Error(`Invalid template: ${errors.join(' | ')}`);
		}
		this.db
			.prepare(
				`UPDATE templates SET name = ?, definition_json = ?, version = version + 1, updated_at = ? WHERE id = ?`,
			)
			.run(nextName, JSON.stringify(next), nowIso(), id);
		const updated = this.getTemplate(id);
		if (!updated) {
			throw new Error('Template update failed');
		}
		return updated;
	}

	/**
	 * Marks one template as default (atomic switch).
	 *
	 * @param id - Template UUID.
	 */
	public setDefaultTemplate(id: string): StoredTemplate {
		const current = this.getTemplate(id);
		if (!current) {
			throw new Error(`Template not found: ${id}`);
		}
		const run = this.db.transaction(() => {
			this.db.prepare(`UPDATE templates SET is_default = 0`).run();
			this.db.prepare(`UPDATE templates SET is_default = 1, updated_at = ? WHERE id = ?`).run(nowIso(), id);
		});
		run();
		const updated = this.getTemplate(id);
		if (!updated) {
			throw new Error('Default switch failed');
		}
		return updated;
	}

	/**
	 * Deletes a template (never the default, never when referenced).
	 *
	 * @param id - Template UUID.
	 */
	public deleteTemplate(id: string): void {
		const current = this.getTemplate(id);
		if (!current) {
			throw new Error(`Template not found: ${id}`);
		}
		if (current.isDefault) {
			throw new Error('The default template cannot be deleted');
		}
		const refs = this.db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE template_id = ?`).get(id) as {
			n: number;
		};
		if (refs.n > 0) {
			throw new Error('Template is referenced by issued invoices and cannot be deleted');
		}
		this.db.prepare(`DELETE FROM templates WHERE id = ?`).run(id);
	}

	/**
	 * Adds a file attachment to an invoice (max 5 MB).
	 *
	 * @param invoiceId - Owning invoice UUID.
	 * @param attachment - Filename, MIME type and content.
	 */
	public addAttachment(invoiceId: string, attachment: NewAttachment): StoredAttachment {
		if (!this.getInvoice(invoiceId)) {
			throw new Error(`Invoice not found: ${invoiceId}`);
		}
		if (attachment.filename.trim().length === 0 || attachment.data.length === 0) {
			throw new Error('Attachment needs a filename and content');
		}
		if (attachment.data.length > 5 * 1024 * 1024) {
			throw new Error('Attachment exceeds 5 MB');
		}
		const result = this.db
			.prepare(
				`INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
				VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(invoiceId, attachment.filename, attachment.mime, attachment.data.length, attachment.data, nowIso());
		const row = this.db.prepare(`SELECT * FROM attachments WHERE id = ?`).get(result.lastInsertRowid) as {
			id: number;
			invoice_id: string;
			filename: string;
			mime: string;
			size: number;
			data: Buffer;
			created_at: string;
		};
		return {
			id: row.id,
			invoiceId: row.invoice_id,
			filename: row.filename,
			mime: row.mime,
			size: row.size,
			data: row.data,
			createdAt: row.created_at,
		};
	}

	/**
	 * Lists attachments of one invoice.
	 *
	 * @param invoiceId - Owning invoice UUID.
	 */
	public listAttachments(invoiceId: string): StoredAttachment[] {
		const rows = this.db
			.prepare(`SELECT * FROM attachments WHERE invoice_id = ? ORDER BY id ASC`)
			.all(invoiceId) as {
			id: number;
			invoice_id: string;
			filename: string;
			mime: string;
			size: number;
			data: Buffer;
			created_at: string;
		}[];
		return rows.map(row => ({
			id: row.id,
			invoiceId: row.invoice_id,
			filename: row.filename,
			mime: row.mime,
			size: row.size,
			data: row.data,
			createdAt: row.created_at,
		}));
	}

	/**
	 * Exports the full database content for backups.
	 */
	public exportData(): DatabaseDump {
		const counters = this.db
			.prepare(`SELECT year, employee, last_seq FROM counters ORDER BY year ASC, employee ASC`)
			.all() as {
			year: number;
			employee: string;
			last_seq: number;
		}[];
		const attachments = this.db.prepare(`SELECT * FROM attachments ORDER BY id ASC`).all() as {
			id: number;
			invoice_id: string;
			filename: string;
			mime: string;
			size: number;
			data: Buffer;
			created_at: string;
		}[];
		return {
			formatVersion: 1,
			exportedAt: nowIso(),
			schemaVersion: this.currentVersion(),
			invoices: this.listInvoices({ limit: 500 }),
			counters,
			templates: this.listTemplates(),
			companies: this.listCompanyProfiles(),
			customers: this.listCustomers(),
			products: this.listProducts(),
			attachments: attachments.map(row => ({
				id: row.id,
				invoiceId: row.invoice_id,
				filename: row.filename,
				mime: row.mime,
				size: row.size,
				data: row.data,
				createdAt: row.created_at,
			})),
		};
	}

	/**
	 * Replaces the full database content (restore path, transactional).
	 * Validates the shape first so bad dumps fail before touching data.
	 *
	 * @param dump - Database content from a backup.
	 */
	public importData(dump: DatabaseDump): void {
		if (!dump || dump.formatVersion !== 1 || !Array.isArray(dump.invoices) || !Array.isArray(dump.templates)) {
			throw new Error('Unsupported dump format');
		}
		for (const invoice of dump.invoices) {
			if (!invoice.id || !['draft', 'issued', 'cancelled'].includes(invoice.status) || !invoice.totals) {
				throw new Error(`Corrupt invoice in dump: ${String((invoice as { id?: unknown }).id)}`);
			}
		}
		const run = this.db.transaction(() => {
			this.db.prepare(`DELETE FROM attachments`).run();
			this.db.prepare(`DELETE FROM invoices`).run();
			this.db.prepare(`DELETE FROM counters`).run();
			this.db.prepare(`DELETE FROM templates`).run();
			this.db.prepare(`DELETE FROM company_profiles`).run();
			this.db.prepare(`DELETE FROM customers`).run();
			this.db.prepare(`DELETE FROM products`).run();
			for (const counter of dump.counters ?? []) {
				const employee = normalizeEmployeeCode((counter as { employee?: string }).employee ?? '00');
				this.db
					.prepare(`INSERT INTO counters (year, employee, last_seq) VALUES (?, ?, ?)`)
					.run(counter.year, employee, counter.last_seq);
			}
			for (const template of dump.templates) {
				this.db
					.prepare(
						`INSERT INTO templates (id, name, version, definition_json, is_default, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?)`,
					)
					.run(
						template.id,
						template.name,
						template.version,
						JSON.stringify(template.definition),
						template.isDefault ? 1 : 0,
						template.createdAt,
						template.updatedAt,
					);
			}
			for (const invoice of dump.invoices) {
				this.db
					.prepare(
						`INSERT INTO invoices
						(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json,
						 profile, status, template_id, document_title, notes, payment_terms, employee_code, xml, pdf_path, xlsx_path, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					)
					.run(
						invoice.id,
						invoice.number,
						invoice.issueDate,
						invoice.deliveryDate,
						invoice.dueDate,
						JSON.stringify(invoice.seller),
						JSON.stringify(invoice.buyer),
						JSON.stringify(invoice.lines),
						JSON.stringify(invoice.totals),
						invoice.profile,
						invoice.status,
						invoice.templateId,
						invoice.documentTitle,
						invoice.notes,
						invoice.paymentTerms ?? null,
						invoice.employeeCode ?? null,
						invoice.xml,
						invoice.pdfPath,
						invoice.xlsxPath,
						invoice.createdAt,
						invoice.updatedAt,
					);
			}
			for (const company of dump.companies ?? []) {
				this.db
					.prepare(
						`INSERT INTO company_profiles (id, name, profile_json, is_default, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?)`,
					)
					.run(
						company.id,
						company.name,
						JSON.stringify(company.profile),
						company.isDefault ? 1 : 0,
						company.createdAt,
						company.updatedAt,
					);
			}
			for (const customer of dump.customers ?? []) {
				this.db
					.prepare(
						`INSERT INTO customers (id, name, profile_json, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?)`,
					)
					.run(
						customer.id,
						customer.name,
						JSON.stringify(customer.profile),
						customer.createdAt,
						customer.updatedAt,
					);
			}
			for (const product of dump.products ?? []) {
				this.db
					.prepare(
						`INSERT INTO products (id, sku, name, details, unit, unit_price_net, vat_rate, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					)
					.run(
						product.id,
						product.sku,
						product.name,
						product.details,
						product.unit,
						product.unitPriceNet,
						product.vatRate,
						product.createdAt,
						product.updatedAt,
					);
			}
			for (const attachment of dump.attachments ?? []) {
				this.db
					.prepare(
						`INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
						VALUES (?, ?, ?, ?, ?, ?)`,
					)
					.run(
						attachment.invoiceId,
						attachment.filename,
						attachment.mime,
						attachment.size,
						attachment.data,
						attachment.createdAt,
					);
			}
		});
		run();
	}

	/**
	 * Logs a backup in the database.
	 *
	 * @param entry - Filename, size, hash and manifest.
	 */
	public logBackup(entry: BackupLogEntry): StoredBackup {
		const id = randomUUID();
		const stamp = nowIso();
		this.db
			.prepare(
				`INSERT INTO backups (id, created_at, filename, size, sha256, manifest_json) VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(id, stamp, entry.filename, entry.size, entry.sha256, entry.manifestJson);
		return { id, createdAt: stamp, ...entry };
	}

	/**
	 * Lists logged backups, newest first.
	 */
	public listBackups(): StoredBackup[] {
		const rows = this.db.prepare(`SELECT * FROM backups ORDER BY created_at DESC`).all() as {
			id: string;
			created_at: string;
			filename: string;
			size: number;
			sha256: string;
			manifest_json: string;
		}[];
		return rows.map(row => ({
			id: row.id,
			createdAt: row.created_at,
			filename: row.filename,
			size: row.size,
			sha256: row.sha256,
			manifestJson: row.manifest_json,
		}));
	}

	/**
	 * Creates a company (seller) profile; the first one becomes default.
	 *
	 * @param name - Display name.
	 * @param profile - Seller party data.
	 */
	public createCompanyProfile(name: string, profile: Party): StoredCompanyProfile {
		if (name.trim().length === 0) {
			throw new Error('Company profile needs a name');
		}
		const id = randomUUID();
		const stamp = nowIso();
		const hasAny = (this.db.prepare(`SELECT COUNT(*) AS n FROM company_profiles`).get() as { n: number }).n > 0;
		this.db
			.prepare(
				`INSERT INTO company_profiles (id, name, profile_json, is_default, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(id, name.trim(), JSON.stringify(profile), hasAny ? 0 : 1, stamp, stamp);
		const created = this.getCompanyProfile(id);
		if (!created) {
			throw new Error('Company profile was not stored');
		}
		return created;
	}

	/**
	 * Loads one company profile by id.
	 *
	 * @param id - Profile UUID.
	 */
	public getCompanyProfile(id: string): StoredCompanyProfile | null {
		const row = this.db.prepare(`SELECT * FROM company_profiles WHERE id = ?`).get(id) as CompanyRow | undefined;
		return row ? mapCompanyRow(row) : null;
	}

	/**
	 * Lists company profiles, default first.
	 */
	public listCompanyProfiles(): StoredCompanyProfile[] {
		const rows = this.db
			.prepare(`SELECT * FROM company_profiles ORDER BY is_default DESC, name ASC`)
			.all() as CompanyRow[];
		return rows.map(mapCompanyRow);
	}

	/**
	 * Returns the default company profile, if any.
	 */
	public getDefaultCompanyProfile(): StoredCompanyProfile | null {
		const row = this.db.prepare(`SELECT * FROM company_profiles WHERE is_default = 1 LIMIT 1`).get() as
			CompanyRow | undefined;
		return row ? mapCompanyRow(row) : null;
	}

	/**
	 * Creates the default company shell on first start (idempotent).
	 * The user fills in their data once on the PWA Firma page.
	 */
	public ensureDefaultCompanyProfile(): StoredCompanyProfile {
		const existing = this.getDefaultCompanyProfile();
		if (existing) {
			return existing;
		}
		const all = this.listCompanyProfiles();
		if (all.length === 0) {
			return this.createCompanyProfile('Meine Firma', {
				name: '',
				street: '',
				zip: '',
				city: '',
				country: 'DE',
			});
		}
		return this.setDefaultCompanyProfile(all[0].id);
	}

	/**
	 * Updates name/party data of a company profile.
	 *
	 * @param id - Profile UUID.
	 * @param patch - Partial update.
	 */
	public updateCompanyProfile(id: string, patch: CompanyPatch): StoredCompanyProfile {
		const current = this.getCompanyProfile(id);
		if (!current) {
			throw new Error(`Company profile not found: ${id}`);
		}
		const name = patch.name?.trim() || current.name;
		const profile = patch.profile ?? current.profile;
		this.db
			.prepare(`UPDATE company_profiles SET name = ?, profile_json = ?, updated_at = ? WHERE id = ?`)
			.run(name, JSON.stringify(profile), nowIso(), id);
		const updated = this.getCompanyProfile(id);
		if (!updated) {
			throw new Error('Company profile update failed');
		}
		return updated;
	}

	/**
	 * Marks one company profile as default (atomic switch).
	 *
	 * @param id - Profile UUID.
	 */
	public setDefaultCompanyProfile(id: string): StoredCompanyProfile {
		if (!this.getCompanyProfile(id)) {
			throw new Error(`Company profile not found: ${id}`);
		}
		const run = this.db.transaction(() => {
			this.db.prepare(`UPDATE company_profiles SET is_default = 0`).run();
			this.db
				.prepare(`UPDATE company_profiles SET is_default = 1, updated_at = ? WHERE id = ?`)
				.run(nowIso(), id);
		});
		run();
		const updated = this.getCompanyProfile(id);
		if (!updated) {
			throw new Error('Default switch failed');
		}
		return updated;
	}

	/**
	 * Deletes a company profile (never the default).
	 *
	 * @param id - Profile UUID.
	 */
	public deleteCompanyProfile(id: string): void {
		const current = this.getCompanyProfile(id);
		if (!current) {
			throw new Error(`Company profile not found: ${id}`);
		}
		if (current.isDefault) {
			throw new Error('The default company profile cannot be deleted');
		}
		this.db.prepare(`DELETE FROM company_profiles WHERE id = ?`).run(id);
	}

	/**
	 * Creates a customer (buyer master data).
	 *
	 * @param name - Display name.
	 * @param profile - Buyer party data.
	 */
	public createCustomer(name: string, profile: Party): StoredCustomer {
		if (name.trim().length === 0) {
			throw new Error('Customer needs a name');
		}
		const id = randomUUID();
		const stamp = nowIso();
		this.db
			.prepare(`INSERT INTO customers (id, name, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
			.run(id, name.trim(), JSON.stringify(profile), stamp, stamp);
		const created = this.getCustomer(id);
		if (!created) {
			throw new Error('Customer was not stored');
		}
		return created;
	}

	/**
	 * Loads one customer by id.
	 *
	 * @param id - Customer UUID.
	 */
	public getCustomer(id: string): StoredCustomer | null {
		const row = this.db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id) as CustomerRow | undefined;
		return row ? mapCustomerRow(row) : null;
	}

	/**
	 * Lists customers by name.
	 */
	public listCustomers(): StoredCustomer[] {
		const rows = this.db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all() as CustomerRow[];
		return rows.map(mapCustomerRow);
	}

	/**
	 * Updates name/party data of a customer.
	 *
	 * @param id - Customer UUID.
	 * @param patch - Partial update.
	 */
	public updateCustomer(id: string, patch: CustomerPatch): StoredCustomer {
		const current = this.getCustomer(id);
		if (!current) {
			throw new Error(`Customer not found: ${id}`);
		}
		const name = patch.name?.trim() || current.name;
		const profile = patch.profile ?? current.profile;
		this.db
			.prepare(`UPDATE customers SET name = ?, profile_json = ?, updated_at = ? WHERE id = ?`)
			.run(name, JSON.stringify(profile), nowIso(), id);
		const updated = this.getCustomer(id);
		if (!updated) {
			throw new Error('Customer update failed');
		}
		return updated;
	}

	/**
	 * Deletes a customer.
	 *
	 * @param id - Customer UUID.
	 */
	public deleteCustomer(id: string): void {
		if (!this.getCustomer(id)) {
			throw new Error(`Customer not found: ${id}`);
		}
		this.db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
	}

	/**
	 * Creates a catalog product/service.
	 *
	 * @param item - Catalog content.
	 */
	public createProduct(item: NewProduct): StoredProduct {
		if (!item.name?.trim()) {
			throw new Error('Product needs a name');
		}
		if (item.vatRate !== undefined && ![0, 7, 19].includes(item.vatRate)) {
			throw new Error('VAT rate must be 0, 7 or 19');
		}
		if ((item.unitPriceNet ?? 0) < 0) {
			throw new Error('Unit price must be >= 0');
		}
		const id = randomUUID();
		const stamp = nowIso();
		this.db
			.prepare(
				`INSERT INTO products (id, sku, name, details, unit, unit_price_net, vat_rate, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				id,
				item.sku?.trim() ?? '',
				item.name.trim(),
				item.details?.trim() ?? '',
				item.unit?.trim() || 'Stk',
				item.unitPriceNet ?? 0,
				item.vatRate ?? 19,
				stamp,
				stamp,
			);
		const created = this.getProduct(id);
		if (!created) {
			throw new Error('Product was not stored');
		}
		return created;
	}

	/**
	 * Loads one catalog product by id.
	 *
	 * @param id - Product UUID.
	 */
	public getProduct(id: string): StoredProduct | null {
		const row = this.db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as ProductRow | undefined;
		return row ? mapProductRow(row) : null;
	}

	/**
	 * Lists catalog products by name.
	 */
	public listProducts(): StoredProduct[] {
		const rows = this.db.prepare(`SELECT * FROM products ORDER BY name ASC`).all() as ProductRow[];
		return rows.map(mapProductRow);
	}

	/**
	 * Updates a catalog product.
	 *
	 * @param id - Product UUID.
	 * @param patch - Partial update.
	 */
	public updateProduct(id: string, patch: ProductPatch): StoredProduct {
		const current = this.getProduct(id);
		if (!current) {
			throw new Error(`Product not found: ${id}`);
		}
		const next = {
			sku: patch.sku !== undefined ? patch.sku.trim() : current.sku,
			name: patch.name?.trim() || current.name,
			details: patch.details !== undefined ? patch.details : current.details,
			unit: patch.unit?.trim() || current.unit,
			unitPriceNet: patch.unitPriceNet ?? current.unitPriceNet,
			vatRate: patch.vatRate ?? current.vatRate,
		};
		if (![0, 7, 19].includes(next.vatRate)) {
			throw new Error('VAT rate must be 0, 7 or 19');
		}
		if (next.unitPriceNet < 0) {
			throw new Error('Unit price must be >= 0');
		}
		this.db
			.prepare(
				`UPDATE products SET sku = ?, name = ?, details = ?, unit = ?, unit_price_net = ?, vat_rate = ?, updated_at = ? WHERE id = ?`,
			)
			.run(next.sku, next.name, next.details, next.unit, next.unitPriceNet, next.vatRate, nowIso(), id);
		const updated = this.getProduct(id);
		if (!updated) {
			throw new Error('Product update failed');
		}
		return updated;
	}

	/**
	 * Deletes a catalog product.
	 *
	 * @param id - Product UUID.
	 */
	public deleteProduct(id: string): void {
		if (!this.getProduct(id)) {
			throw new Error(`Product not found: ${id}`);
		}
		this.db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
	}
}
