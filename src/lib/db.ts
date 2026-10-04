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
import { ATTACHMENT_MAX_COUNT, checkAttachment } from './attachments';
import {
	blankDraft,
	calcTotals,
	DEFAULT_NUMBER_FORMAT,
	DEFAULT_QUOTE_NUMBER_FORMAT,
	defaultDocumentTitle,
	defaultValidUntil,
	formatCustomerNumber,
	formatInvoiceNumber,
	isQuote,
	normalizeDocumentType,
	normalizeEmployeeCode,
	normalizeNumberFormat,
	quoteState,
	renderInvoiceNumber,
	todayIso,
	validateInvoiceForIssue,
	type DocumentType,
	type InvoiceDraftInput,
	type InvoiceStatus,
	type InvoiceTotals,
	type Party,
	type QuoteDecision,
} from './invoice-model';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';
import {
	DEFAULT_DUNNING_TEXTS,
	MAX_DUNNING_LEVEL,
	validateDunningPatch,
	type DunningText,
	type DunningTextPatch,
} from './dunning';
import {
	DEFAULT_TEMPLATE,
	stripCleared,
	validateTemplate,
	type LayoutTemplate,
	type TemplateSnapshot,
} from './templates';

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
	/** Document type (R8): invoice (default) or quotation. */
	docType: DocumentType;
	/** Layout template id, null until artifacts attached. */
	templateId: string | null;
	/** The layout the document was issued with, frozen (R7.8); null for older documents. */
	templateSnapshot: TemplateSnapshot | null;
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
	/** True once the invoice has been marked as paid (Skonto must be considered). */
	paid: boolean;
	/** ISO date/time of the payment, null while unpaid. */
	paidAt: string | null;
	/** Id of the invoice this one reverses (Storno), null otherwise. */
	stornoOfId: string | null;
	/** Cash discount in percent, 0 when none. */
	skontoPercent: number;
	/** Last day for the cash discount, null when none. */
	skontoDueDate: string | null;
	/** ISO date/time of the handover to the customer, null while unsent. */
	sentAt: string | null;
	/** How it was delivered, e.g. `E-Mail`. */
	sendChannel: string | null;
	/** § 16 Abs. 2 Nr. 2 UStG payment-method check: pending | passed | failed. */
	paymentCheck: string | null;
	/** When the payment method was checked. */
	paymentCheckedAt: string | null;
	/** When the last reminder was sent. */
	remindedAt: string | null;
	/** How many reminders were already sent. */
	reminderLevel: number;
	/** Earliest deletion date: ten years after the issue year (cautious; the statutory minimum for invoices is eight, § 147 AO / § 14b UStG). */
	retainUntil: string | null;
	/** Quotation only: last day the offer stands (R8). */
	validUntil: string | null;
	/** Quotation only: id of the quotation this invoice came from (R8). */
	sourceDocumentId: string | null;
	/** Company profile the document was written for (R6.3); null for older documents. */
	companyId: string | null;
	/** Quotation only: when the customer accepted the offer. */
	acceptedAt: string | null;
	/** Quotation only: when the customer declined the offer. */
	rejectedAt: string | null;
	/** Quotation only: why the offer was declined. */
	rejectionReason: string | null;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

/** Generated output attached to an issued invoice. */
export interface IssueArtifacts {
	/** Structured EN 16931 XML string; absent for a quotation (R8). */
	xml?: string;
	/** Mount path of the hybrid PDF (null when the write failed). */
	pdfPath: string | null;
	/** Mount path of the Excel copy (optional). */
	xlsxPath?: string;
	/** Layout template id (optional). */
	templateId?: string | null;
	/** The layout to freeze with the document (R7.8); omitted = keep what is stored. */
	templateSnapshot?: TemplateSnapshot | null;
}

/** List filter for invoices. */
export interface InvoiceFilter {
	/** Filter by lifecycle status. */
	status?: InvoiceStatus;
	/** Leave out documents with this status (the exports use it to leave out drafts). */
	excludeStatus?: InvoiceStatus;
	/** First issue date, inclusive, ISO `YYYY-MM-DD`. */
	from?: string;
	/** Last issue date, inclusive, ISO `YYYY-MM-DD`. */
	to?: string;
	/** No page limit: everything that matches (exports must never be cut). */
	all?: boolean;
	/** Filter by document type (invoices, quotations or both). */
	docType?: DocumentType;
	/** Only documents created from this quotation (R8, chain Angebot → Rechnung). */
	sourceDocumentId?: string;
	/** Only documents of this company profile (R6.3); `none` = documents without a company. */
	companyId?: string;
	/** Filter by issue year. */
	year?: number;
	/** Free-text search over number, parties, position texts and notes. */
	query?: string;
	/** Only sent (true) or only unsent (false) invoices. */
	sent?: boolean;
	/** Sort column: date, amount, customer, number, due or status. */
	sort?: 'date' | 'amount' | 'customer' | 'number' | 'due' | 'status';
	/** Sort direction, default desc. */
	order?: 'asc' | 'desc';
	/** Page size 1-500, default 50. */
	limit?: number;
	/** Page offset, default 0. */
	offset?: number;
}

function nowIso(): string {
	return new Date().toISOString();
}

/**
 * Lowercase, collapse whitespace and drop diacritics for fuzzy comparison.
 *
 * @param value - Raw text.
 * @returns Comparable form.
 */
function normalizeForSearch(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ß/g, 'ss')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * Levenshtein distance with a two-row buffer. Used to survive typos and
 * spelling variants such as "Brod GmbH" vs "Brod GMBH & Co".
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns Edit distance.
 */
export function levenshtein(a: string, b: string): number {
	if (a === b) {
		return 0;
	}
	if (!a.length) {
		return b.length;
	}
	if (!b.length) {
		return a.length;
	}
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	let curr = new Array<number>(b.length + 1);
	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
		}
		[prev, curr] = [curr, prev];
	}
	return prev[b.length];
}

/**
 * How well a customer matches the search term; higher is better.
 *
 * @param customer - Candidate.
 * @param needle - Normalised search term.
 * @returns Relevance score, 0 when the customer does not match.
 */
function customerScore(customer: StoredCustomer, needle: string): number {
	const haystacks = [
		customer.name,
		customer.profile.name,
		customer.profile.customerNumber ?? '',
		customer.profile.city ?? '',
	]
		.map(normalizeForSearch)
		.filter(Boolean);
	if (!haystacks.length) {
		return 0;
	}
	let best = 0;
	for (const hay of haystacks) {
		if (hay === needle) {
			return 1000;
		}
		// prefix matches are what a human expects from a search box
		if (hay.startsWith(needle)) {
			best = Math.max(best, 500 - hay.length);
		}
		if (hay.includes(needle)) {
			best = Math.max(best, 400 - hay.length);
		}
		// Compare word by word: a typo hits one word, not the whole name, so
		// "brof" must match "Brod GmbH & Co. KG" instead of its full 16 chars.
		const words = hay.split(' ');
		for (const word of words) {
			if (word.startsWith(needle)) {
				best = Math.max(best, 300 - word.length);
			}
			// one typo per three characters, at least three characters
			const tolerance = needle.length >= 5 ? 2 : needle.length >= 3 ? 1 : 0;
			if (
				tolerance > 0 &&
				Math.abs(word.length - needle.length) <= tolerance &&
				levenshtein(word, needle) <= tolerance
			) {
				best = Math.max(best, 200);
			}
		}
	}
	return best;
}

/**
 * Ranks customers by relevance, dropping everything that does not match at
 * all. A fixed number of results is enough to catch a typo without flooding
 * the picker with unrelated customers.
 *
 * @param customers - All customers.
 * @param query - Search term.
 * @returns Matching customers, best first.
 */
export function rankCustomers(customers: StoredCustomer[], query: string): StoredCustomer[] {
	const needle = normalizeForSearch(query);
	if (!needle) {
		return customers;
	}
	return customers
		.map(c => ({ c, score: customerScore(c, needle) }))
		.filter(entry => entry.score > 0)
		.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name, 'de'))
		.slice(0, 50)
		.map(entry => entry.c);
}

/**
 * Earliest legal deletion date of an issued invoice: ten years after the end
 * of the year it was issued (§ 147 Abs. 3 AO, § 14b Abs. 3 UStG).
 *
 * @param issueDate - ISO issue date.
 * @returns ISO date, or null when the input is unusable.
 */
export function retentionUntil(issueDate: string): string | null {
	const year = Number((issueDate ?? '').slice(0, 4));
	if (!Number.isInteger(year) || year < 1990 || year > 2200) {
		return null;
	}
	// Retention runs to the end of the tenth year after issuance.
	return `${year + 10}-12-31`;
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
	doc_type: string;
	template_id: string | null;
	template_snapshot_json: string | null;
	company_id: string | null;
	document_title: string;
	notes: string | null;
	employee_code: string | null;
	payment_terms: string | null;
	xml: string | null;
	pdf_path: string | null;
	xlsx_path: string | null;
	paid: number;
	paid_at: string | null;
	storno_of_id: string | null;
	skonto_percent: number;
	skonto_due_date: string | null;
	sent_at: string | null;
	send_channel: string | null;
	payment_check: string | null;
	payment_checked_at: string | null;
	reminded_at: string | null;
	reminder_level: number;
	retain_until: string | null;
	valid_until: string | null;
	source_document_id: string | null;
	accepted_at: string | null;
	rejected_at: string | null;
	rejection_reason: string | null;
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
		docType: normalizeDocumentType(row.doc_type),
		templateId: row.template_id,
		templateSnapshot: row.template_snapshot_json
			? parseJson<TemplateSnapshot>(row.template_snapshot_json, 'template snapshot')
			: null,
		documentTitle: row.document_title,
		notes: row.notes,
		employeeCode: row.employee_code ?? null,
		paymentTerms: row.payment_terms ?? null,
		xml: row.xml,
		pdfPath: row.pdf_path,
		xlsxPath: row.xlsx_path,
		paid: row.paid === 1,
		paidAt: row.paid_at,
		stornoOfId: row.storno_of_id,
		skontoPercent: row.skonto_percent ?? 0,
		skontoDueDate: row.skonto_due_date,
		sentAt: row.sent_at,
		sendChannel: row.send_channel,
		paymentCheck: row.payment_check,
		paymentCheckedAt: row.payment_checked_at,
		remindedAt: row.reminded_at,
		reminderLevel: row.reminder_level,
		retainUntil: row.retain_until,
		validUntil: row.valid_until,
		sourceDocumentId: row.source_document_id,
		companyId: row.company_id ?? null,
		acceptedAt: row.accepted_at,
		rejectedAt: row.rejected_at,
		rejectionReason: row.rejection_reason,
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
	/**
	 * Client-declared MIME type. Optional, because the stored type is taken from
	 * the content (magic bytes), see `attachments.ts`.
	 */
	mime?: string;
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

/** Stored attachment without its content (list view, API list route). */
export interface StoredAttachmentMeta {
	/** Row id. */
	id: number;
	/** Owning invoice UUID. */
	invoiceId: string;
	/** Original filename. */
	filename: string;
	/** MIME type taken from the content. */
	mime: string;
	/** Size in bytes. */
	size: number;
	/** Creation timestamp. */
	createdAt: string;
}

/** `attachments` row as SQLite returns it. */
interface AttachmentRow {
	id: number;
	invoice_id: string;
	filename: string;
	mime: string;
	size: number;
	data: Buffer;
	created_at: string;
}

/** `attachments` row without the BLOB column. */
type AttachmentMetaRow = Omit<AttachmentRow, 'data'>;

/**
 * Maps an `attachments` row to the stored shape.
 *
 * @param row - Row of the attachments table.
 */
function mapAttachment(row: AttachmentRow): StoredAttachment {
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
 * Maps an `attachments` row without content to the metadata shape.
 *
 * @param row - Row of the attachments table (without `data`).
 */
function mapAttachmentMeta(row: AttachmentMetaRow): StoredAttachmentMeta {
	return {
		id: row.id,
		invoiceId: row.invoice_id,
		filename: row.filename,
		mime: row.mime,
		size: row.size,
		createdAt: row.created_at,
	};
}

/** Number-circle row: one counter per year, employee and document type (R8). */
export interface YearCounter {
	/** Calendar year. */
	year: number;
	/** Employee code. */
	employee: string;
	/** Document type the circle belongs to (`invoice` also for legacy rows). */
	doc_type: string;
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
	/** Dunning levels the user changed (R6.4); missing = keep what is stored. */
	dunningTexts?: DunningTextRow[];
}

/** A dunning level as stored (R6.4). */
export interface DunningTextRow {
	/** Level 1 to 3. */
	level: number;
	/** Subject line. */
	subject: string;
	/** Letter body. */
	body: string;
	/** Overdue days from which the level is suggested. */
	days: number;
	/** Payment deadline in days. */
	deadlineDays: number;
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

/** One re-render step of an issued invoice's artifacts. */
export interface RenderHistoryEntry {
	/** Which artifact was regenerated, e.g. `pdf`. */
	artifact: string;
	/** Path of the archived original, null on the first re-render. */
	previousPath: string | null;
	/** Path of the freshly rendered file. */
	newPath: string;
	/** Free-text reason given by the user. */
	reason: string | null;
	/**
	 * Which layout the re-render used (R7.8): `issued` (the frozen one), `current` (the
	 * template as it is now, frozen anew) or `current-unfrozen` (the document had no
	 * frozen layout yet). Null for entries from before the snapshot existed.
	 */
	layout: string | null;
	/** ISO timestamp. */
	createdAt: string;
}

/** One stored validation report of an invoice (R2: proof of the check). */
export interface ValidationReportEntry {
	/** Running number, also part of the filename (`…validation-<seq>.json`). */
	seq: number;
	/** Storage-relative path of the stored JSON report. */
	reportPath: string;
	/** Number of technical (XSD) errors in this run. */
	formatErrors: number;
	/** Number of business-rule findings in this run. */
	businessErrors: number;
	/** ISO timestamp of the run. */
	createdAt: string;
}

/** Reusable invoice content, e.g. a monthly maintenance invoice. */
export interface StoredInvoiceTemplate {
	/** Template UUID. */
	id: string;
	/** Display name. */
	name: string;
	/** Draft content, reused for new invoices. */
	body: InvoiceDraftInput;
	/** Creation timestamp. */
	createdAt: string;
	/** Last update timestamp. */
	updatedAt: string;
}

/**
 * SQL helper for the invoice list: matches a search term against net, tax and
 * gross total of a stored `totals_json`.
 *
 * A user types an amount as they see it, so "2963,10", "2963.10", "2.963,10",
 * "2963" and a currency-appended "2963,10 EUR" must all find the same invoice.
 * A term that is not a number never matches, so the text search keeps its
 * meaning.
 *
 * @param totalsJson - The raw `totals_json` column.
 * @param term - The user's search term.
 * @returns 1 when one of the totals matches, else 0.
 */
function registerAmountMatcher(totalsJson: string | null, term: string | null): number {
	const needle = String(term ?? '').trim();
	// Accept what a user actually types: a currency suffix, either decimal
	// mark and either thousands separator.
	const cleaned = needle
		.replace(/[€\s]/g, '')
		.replace(/EUR|eur/g, '')
		.trim();
	// Split off a thousands separator first: "2.963,10" and "2,963.10" both
	// group the leading digits, and the mark that remains is the decimal one.
	let digits: string;
	const grouped = /^(\d{1,3}(?:[.,]\d{3})+)([.,])(\d+)$/.exec(cleaned);
	if (grouped) {
		digits = `${grouped[1].replace(/[.,]/g, '')}.${grouped[3]}`;
	} else {
		// No grouping: a comma is a decimal mark, a dot may be one too.
		digits = cleaned.replace(',', '.');
	}
	if (!/^\d+(\.\d+)?$/.test(digits)) {
		return 0;
	}
	const wanted = Number(digits);
	if (!Number.isFinite(wanted)) {
		return 0;
	}
	let totals: { netTotal?: number; taxTotal?: number; grossTotal?: number };
	try {
		totals = JSON.parse(String(totalsJson ?? '{}')) as typeof totals;
	} catch {
		return 0;
	}
	// Compare in cents so 2963,1 and 2963,10 stay distinct. A bare integer
	// term may also match a value with cents, because users round mentally:
	// typing 2963 should find 2963.10.
	const cent = Math.round(wanted * 100);
	const rounded = Number.isInteger(wanted);
	for (const value of [totals.grossTotal, totals.netTotal, totals.taxTotal]) {
		const stored = Math.round(Number(value) * 100);
		if (Number.isFinite(stored) && (stored === cent || (rounded && Math.abs(stored - cent) < 100))) {
			return 1;
		}
	}
	return 0;
}

/**
 * Invoice database with atomic numbering and migrations.
 */
export class InvoiceDatabase {
	private readonly db: Database.Database;
	/** Invoice number format from the instance config. */
	private numberFormat = DEFAULT_NUMBER_FORMAT;
	/** Quotation number format from the instance config (own circle, R8). */
	private quoteNumberFormat = DEFAULT_QUOTE_NUMBER_FORMAT;

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
		// Amount search helper, see registerAmountMatcher below.
		this.db.function('amountMatches', { deterministic: true }, registerAmountMatcher);
	}

	/**
	 * Applies the instance configuration that influences numbering.
	 * An invalid format is rejected here so the adapter can warn once.
	 *
	 * @param options - Adapter options from the instance config.
	 * @param options.numberFormat - Desired invoice number pattern.
	 * @param options.quoteNumberFormat - Desired quotation number pattern.
	 */
	public applyOptions(options: { numberFormat?: string; quoteNumberFormat?: string }): void {
		this.numberFormat = options.numberFormat ?? DEFAULT_NUMBER_FORMAT;
		this.quoteNumberFormat = options.quoteNumberFormat ?? DEFAULT_QUOTE_NUMBER_FORMAT;
	}

	/**
	 * The number format actually in use (falls back to the default when the
	 * configured one was rejected).
	 *
	 * @returns A validated format string.
	 */
	public effectiveNumberFormat(): string {
		return normalizeNumberFormat(this.numberFormat) ?? DEFAULT_NUMBER_FORMAT;
	}

	/**
	 * Effective, validated quotation number format (own circle, R8).
	 */
	public effectiveQuoteNumberFormat(): string {
		return normalizeNumberFormat(this.quoteNumberFormat) ?? DEFAULT_QUOTE_NUMBER_FORMAT;
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
	 * Reserves the next document number for a document type + year + employee
	 * atomically (`YYYY-EE-NNN`, custom format honoured).
	 *
	 * Invoice and quotation circles are strictly separate (R8): issuing a
	 * quotation never advances the invoice sequence and vice versa, so the
	 * invoice numbering stays uninterrupted (§ 14 Abs. 4 Nr. 4 UStG).
	 *
	 * @param docType - Invoice (default) or quotation.
	 * @param year - Calendar year, e.g. 2026.
	 * @param employee - Employee code, defaults to `00`.
	 */
	public nextDocumentNumber(docType: DocumentType, year: number, employee?: string): string {
		if (!Number.isInteger(year) || year < 2000 || year > 2100) {
			throw new Error(`Invalid year: ${year}`);
		}
		const kind = normalizeDocumentType(docType);
		const code = normalizeEmployeeCode(employee);
		// only a validated custom format is honoured, otherwise the default
		const fallback = kind === 'quote' ? DEFAULT_QUOTE_NUMBER_FORMAT : DEFAULT_NUMBER_FORMAT;
		const format = normalizeNumberFormat(kind === 'quote' ? this.quoteNumberFormat : this.numberFormat) ?? fallback;
		const run = this.db.transaction((): string => {
			const row = this.db
				.prepare(`SELECT last_seq AS seq FROM counters WHERE year = ? AND employee = ? AND doc_type = ?`)
				.get(year, code, kind) as {
				seq?: number;
			} | null;
			const next = (row?.seq ?? 0) + 1;
			this.db
				.prepare(
					`INSERT INTO counters (year, employee, doc_type, last_seq) VALUES (?, ?, ?, ?)
					ON CONFLICT(year, employee, doc_type) DO UPDATE SET last_seq = excluded.last_seq`,
				)
				.run(year, code, kind, next);
			if (kind === 'quote') {
				return renderInvoiceNumber(format, { year, employee: code, seq: next });
			}
			return format === DEFAULT_NUMBER_FORMAT
				? formatInvoiceNumber(year, code, next)
				: renderInvoiceNumber(format, { year, employee: code, seq: next });
		});
		return run();
	}

	/**
	 * Next invoice number (`YYYY-EE-NNN`).
	 *
	 * @param year - Calendar year.
	 * @param employee - Employee code, defaults to `00`.
	 */
	public nextInvoiceNumber(year: number, employee?: string): string {
		return this.nextDocumentNumber('invoice', year, employee);
	}

	/**
	 * Next quotation number (`A-YYYY-EE-NNN` by default, own circle).
	 *
	 * @param year - Calendar year.
	 * @param employee - Employee code, defaults to `00`.
	 */
	public nextQuoteNumber(year: number, employee?: string): string {
		return this.nextDocumentNumber('quote', year, employee);
	}

	/**
	 * Creates a new draft (may be incomplete; validation happens at issue).
	 *
	 * @param input - Draft content; `docType` decides invoice vs. quotation.
	 */
	public createDraft(input: InvoiceDraftInput): StoredInvoice {
		const id = randomUUID();
		const stamp = nowIso();
		const kind = normalizeDocumentType(input.docType);
		const totals = calcTotals(input.lines.length > 0 ? input.lines : []);
		const companyId = this.checkedCompanyId(input.companyId);
		this.db
			.prepare(
				`INSERT INTO invoices
				(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json, profile, status, doc_type, template_id, document_title, notes, payment_terms, employee_code, skonto_percent, skonto_due_date, valid_until, source_document_id, company_id, created_at, updated_at)
				VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'EN16931', 'draft', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
				kind,
				input.documentTitle?.trim() || defaultDocumentTitle(kind),
				input.notes ?? null,
				input.paymentTerms ?? null,
				input.employeeCode?.trim() ? normalizeEmployeeCode(input.employeeCode) : null,
				Number(input.skontoPercent) || 0,
				input.skontoDueDate?.trim() || null,
				input.validUntil?.trim() || null,
				input.sourceDocumentId ?? null,
				companyId,
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
	 * Normalises the company a document is bound to (R6.3).
	 *
	 * @param value - Company profile id, empty or null for "none".
	 * @returns The id, or null when none was given.
	 * @throws {Error} When the profile does not exist.
	 */
	private checkedCompanyId(value: string | null | undefined): string | null {
		const id = typeof value === 'string' ? value.trim() : '';
		if (!id) {
			return null;
		}
		if (!this.getCompanyProfile(id)) {
			throw new Error(`Unknown company profile: ${id}`);
		}
		return id;
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
		if (filter.docType) {
			where.push(`doc_type = ?`);
			params.push(normalizeDocumentType(filter.docType));
		}
		if (filter.sourceDocumentId) {
			where.push(`source_document_id = ?`);
			params.push(filter.sourceDocumentId);
		}
		if (filter.companyId === 'none') {
			where.push(`company_id IS NULL`);
		} else if (filter.companyId) {
			where.push(`company_id = ?`);
			params.push(filter.companyId);
		}
		if (filter.excludeStatus) {
			where.push(`status <> ?`);
			params.push(filter.excludeStatus);
		}
		if (filter.from) {
			where.push(`issue_date >= ?`);
			params.push(filter.from);
		}
		if (filter.to) {
			where.push(`issue_date <= ?`);
			params.push(filter.to);
		}
		if (filter.status) {
			where.push(`status = ?`);
			params.push(filter.status);
		}
		if (filter.year) {
			where.push(`substr(issue_date, 1, 4) = ?`);
			params.push(String(filter.year));
		}
		if (filter.query) {
			// lines_json holds the position texts, so a search for "Ladersessel"
			// finds the invoice even when number and customer do not match.
			// totals_json is included because an amount is the other thing people
			// look for. Amounts are compared numerically, so "2963,10", "2963.10"
			// and "2963,1" all hit the same record.
			where.push(
				`(number LIKE ? OR buyer_json LIKE ? OR seller_json LIKE ? OR lines_json LIKE ? OR notes LIKE ?` +
					` OR amountMatches(totals_json, ?))`,
			);
			const like = `%${filter.query}%`;
			params.push(like, like, like, like, like, filter.query);
		}
		if (filter.sent === true) {
			where.push(`sent_at IS NOT NULL`);
		} else if (filter.sent === false) {
			where.push(`sent_at IS NULL`);
		}
		// NaN-safe: an unparsable ?limit=abc must not reach the driver as NaN.
		const rawLimit = Number(filter.limit);
		const rawOffset = Number(filter.offset);
		const limit = filter.all
			? -1 // SQLite: a negative LIMIT means no limit
			: Number.isFinite(rawLimit)
				? Math.min(Math.max(Math.trunc(rawLimit), 1), 500)
				: 50;
		const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
		// Every sort column is a fixed whitelist, never client input, so no
		// injection via ORDER BY is possible.
		const sortColumns: Record<string, string> = {
			date: 'issue_date',
			// single quotes: SQLite wants them around the JSON path, and the
			// value is already numeric, so ordering is a plain numeric compare
			amount: `json_extract(totals_json, '$.grossTotal')`,
			customer: 'buyer_json',
			number: 'number',
			due: 'due_date',
			status: 'status',
		};
		const column = sortColumns[filter.sort ?? 'date'] ?? 'issue_date';
		const direction = filter.order === 'asc' ? 'ASC' : 'DESC';
		const rows = this.db
			.prepare(
				`SELECT * FROM invoices ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${column} ${direction}, number ${direction}, id DESC LIMIT ? OFFSET ?`,
			)
			.all(...params, limit, offset) as InvoiceRow[];
		return rows.map(mapRow);
	}

	/**
	 * All invoices, newest first, without the list page limit.
	 * Used by the backup so a restore can never silently drop records.
	 *
	 * @returns - Every stored invoice.
	 */
	public allInvoices(): StoredInvoice[] {
		const rows = this.db.prepare(`SELECT * FROM invoices ORDER BY created_at DESC, id DESC`).all() as InvoiceRow[];
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
		// an explicit null clears a field; an empty string is treated the same,
		// because both mean "no value" in the PWA
		const pick = (next: string | null | undefined, fallback: string | null | undefined): string | undefined =>
			next === null || next === '' ? undefined : (next ?? fallback ?? undefined);
		// switching the document type flips the title to that type's default,
		// unless the patch carries its own title (R8)
		const kindSwitch = patch.docType !== undefined && normalizeDocumentType(patch.docType) !== current.docType;
		const merged: InvoiceDraftInput = {
			seller: patch.seller ?? current.seller,
			buyer: patch.buyer ?? current.buyer,
			lines: patch.lines ?? current.lines,
			issueDate: patch.issueDate ?? current.issueDate,
			deliveryDate: patch.deliveryDate ?? current.deliveryDate,
			dueDate: pick(patch.dueDate, current.dueDate),
			currency: 'EUR',
			employeeCode: pick(patch.employeeCode, current.employeeCode),
			paymentTerms: pick(patch.paymentTerms, current.paymentTerms),
			docType: patch.docType === undefined ? current.docType : normalizeDocumentType(patch.docType),
			documentTitle:
				pick(patch.documentTitle, current.documentTitle) ||
				(kindSwitch ? defaultDocumentTitle(patch.docType) : current.documentTitle),
			notes: pick(patch.notes, current.notes),
			skontoPercent: patch.skontoPercent ?? current.skontoPercent,
			skontoDueDate: pick(patch.skontoDueDate, current.skontoDueDate),
			validUntil: pick(patch.validUntil, current.validUntil),
			// R6.3: missing keeps the binding, null or empty unbinds it
			companyId: patch.companyId === undefined ? current.companyId : patch.companyId,
		};
		const companyId = this.checkedCompanyId(merged.companyId);
		const totals = calcTotals(merged.lines.length > 0 ? merged.lines : []);
		this.db
			.prepare(
				`UPDATE invoices SET issue_date = ?, delivery_date = ?, due_date = ?, seller_json = ?, buyer_json = ?,
				lines_json = ?, totals_json = ?, document_title = ?, notes = ?, payment_terms = ?, employee_code = ?,
				skonto_percent = ?, skonto_due_date = ?, doc_type = ?, valid_until = ?, company_id = ?, updated_at = ? WHERE id = ?`,
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
				merged.employeeCode?.trim() ? normalizeEmployeeCode(merged.employeeCode) : null,
				Number(merged.skontoPercent) || 0,
				merged.skontoDueDate?.trim() || null,
				normalizeDocumentType(merged.docType),
				merged.validUntil?.trim() || null,
				companyId,
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
	 * (`YYYY-EE-NNN` for invoices, `A-YYYY-EE-NNN` for quotations — separate
	 * circles, from issue year + employee code) atomically and freezes the
	 * record. File paths are attached later
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
		// invoice and quotation have separate number circles (R8)
		const docType = normalizeDocumentType(current.docType);
		const errors = validateInvoiceForIssue({
			seller: current.seller,
			buyer: current.buyer,
			lines: current.lines,
			issueDate: current.issueDate,
			deliveryDate: current.deliveryDate,
			dueDate: current.dueDate ?? undefined,
			currency: 'EUR',
			docType: current.docType,
			employeeCode: current.employeeCode ?? undefined,
			documentTitle: current.documentTitle,
			notes: current.notes ?? undefined,
			validUntil: current.validUntil ?? undefined,
		});
		if (errors.length > 0) {
			throw new Error(`Invoice not issuable: ${errors.join(' | ')}`);
		}
		const run = this.db.transaction((): StoredInvoice => {
			const number = this.nextDocumentNumber(docType, year, current.employeeCode ?? undefined);
			// R8: a quotation without an explicit validity gets the default of
			// 30 days at issue time, so "Verfallen" always has a date to hang on.
			const validUntil = isQuote(docType)
				? current.validUntil?.trim() || defaultValidUntil(current.issueDate)
				: (current.validUntil ?? null);
			// Refresh the totals snapshot so a draft saved under older rounding
			// rules can never be frozen with stale figures.
			this.db
				.prepare(
					`UPDATE invoices SET number = ?, status = 'issued', totals_json = ?, retain_until = ?, valid_until = ?, updated_at = ? WHERE id = ? AND status = 'draft'`,
				)
				.run(
					number,
					JSON.stringify(calcTotals(current.lines)),
					// § 147 AO / § 14b UStG: eight years for invoices since 2025; ten are kept to be on the safe side, computed once at issuance.
					// A quotation is no booking record, so it carries no
					// retention date at all (R8).
					isQuote(docType) ? null : retentionUntil(current.issueDate),
					validUntil,
					nowIso(),
					id,
				);
			const issued = this.getInvoice(id);
			if (!issued || issued.number !== number) {
				throw new Error('Issue transaction failed');
			}
			return issued;
		});
		return run();
	}

	/**
	 * Records the customer's decision on an issued quotation (R8).
	 *
	 * The decision is bookkeeping only: it never changes the frozen PDF, it
	 * documents what the customer said and when. A second decision is refused,
	 * so a mis-click cannot overwrite the first answer.
	 *
	 * @param id - Quotation UUID.
	 * @param decision - `accepted` or `rejected`.
	 * @param options - Optional timestamp and rejection reason.
	 * @param options.at - ISO timestamp of the decision, defaults to now.
	 * @param options.reason - Free-text reason, stored with a rejection.
	 */
	public setQuoteDecision(
		id: string,
		decision: QuoteDecision,
		options: { at?: string; reason?: string } = {},
	): StoredInvoice {
		if (decision !== 'accepted' && decision !== 'rejected') {
			throw new Error(`Unknown decision: ${String(decision)}`);
		}
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (!isQuote(current.docType)) {
			throw new Error('Only a quotation knows a customer decision (R8).');
		}
		if (current.status !== 'issued') {
			throw new Error('Issue the quotation before recording a decision.');
		}
		if (current.acceptedAt || current.rejectedAt) {
			throw new Error('The decision on this quotation was already recorded.');
		}
		const at = options.at?.trim() || nowIso();
		if (decision === 'accepted') {
			this.db.prepare(`UPDATE invoices SET accepted_at = ?, updated_at = ? WHERE id = ?`).run(at, nowIso(), id);
		} else {
			this.db
				.prepare(`UPDATE invoices SET rejected_at = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`)
				.run(at, options.reason?.trim() || null, nowIso(), id);
		}
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error('Decision update failed');
		}
		return updated;
	}

	/**
	 * Creates an invoice draft from a quotation (R8).
	 *
	 * The quotation itself is never edited (GoBD): the draft copies parties,
	 * lines, terms and cash discount, points back through `source_document_id`
	 * and is then issued as an ordinary invoice with a number from the invoice
	 * circle. Its own issue date defaults to today, because the invoice is
	 * dated when it is written — not when the offer was made.
	 *
	 * @param quoteId - Quotation UUID.
	 * @param patch - Overrides for the new draft (lines, dates, terms …).
	 * @param options - Conversion options.
	 * @param options.requireAccepted - Refuse a quotation the customer has not accepted yet.
	 */
	public convertQuoteToInvoice(
		quoteId: string,
		patch: Partial<InvoiceDraftInput> = {},
		options: { requireAccepted?: boolean } = {},
	): StoredInvoice {
		const quote = this.getInvoice(quoteId);
		if (!quote) {
			throw new Error(`Invoice not found: ${quoteId}`);
		}
		if (!isQuote(quote.docType)) {
			throw new Error('Only a quotation can be turned into an invoice (R8).');
		}
		if (quote.status !== 'issued') {
			throw new Error('Issue the quotation before creating an invoice from it.');
		}
		if (options.requireAccepted && quoteState(quote) !== 'accepted') {
			throw new Error('The customer has not accepted this quotation yet.');
		}
		// one open draft per quotation; already issued invoices stay untouched,
		// so a partial and a final invoice can both follow the same offer
		const openDraft = this.listInvoices({ docType: 'invoice', status: 'draft', sourceDocumentId: quote.id });
		if (openDraft.length > 0) {
			throw new Error(`An invoice draft from this quotation already exists: ${openDraft[0].id}`);
		}
		return this.createDraft({
			...blankDraft(todayIso(), 'invoice'),
			seller: quote.seller,
			buyer: quote.buyer,
			lines: quote.lines,
			deliveryDate: quote.deliveryDate,
			paymentTerms: quote.paymentTerms ?? undefined,
			notes: quote.notes ?? undefined,
			employeeCode: quote.employeeCode ?? undefined,
			companyId: quote.companyId,
			skontoPercent: quote.skontoPercent,
			skontoDueDate: quote.skontoDueDate ?? undefined,
			...patch,
			// a conversion never produces anything but an invoice
			docType: 'invoice',
			documentTitle: patch.documentTitle?.trim() || defaultDocumentTitle('invoice'),
			sourceDocumentId: quote.id,
		});
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
				`UPDATE invoices SET xml = ?, pdf_path = ?, xlsx_path = ?, template_id = ?, template_snapshot_json = COALESCE(?, template_snapshot_json), updated_at = ? WHERE id = ?`,
			)
			.run(
				artifacts.xml ?? null,
				artifacts.pdfPath,
				artifacts.xlsxPath ?? null,
				artifacts.templateId ?? null,
				artifacts.templateSnapshot ? JSON.stringify(artifacts.templateSnapshot) : null,
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
	 * Issued documents that miss a stored file or the XML (M1): the number is consumed when a document is
	 * issued, the files are made right after, so a failure in between leaves a document without them.
	 * Whether that is really the case for a document is decided by `missingArtifacts` (issue-service).
	 */
	public listIncompleteDocuments(): StoredInvoice[] {
		const rows = this.db
			.prepare(
				`SELECT * FROM invoices WHERE status = 'issued' AND number IS NOT NULL AND (
					pdf_path IS NULL OR pdf_path = '' OR xlsx_path IS NULL OR xlsx_path = ''
					OR (doc_type = 'invoice' AND (xml IS NULL OR xml = ''))
				) ORDER BY issue_date, number`,
			)
			.all() as InvoiceRow[];
		return rows.map(mapRow);
	}

	/**
	 * Marks an issued invoice as paid or unpaid. Payment state is bookkeeping
	 * only — it never changes the frozen XML artifact (GoBD).
	 *
	 * @param id - Invoice UUID.
	 * @param paid - New payment state.
	 * @param paidAt - ISO date of the payment, defaults to now.
	 */
	public setPaid(id: string, paid: boolean, paidAt?: string): StoredInvoice {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status === 'draft') {
			throw new Error('Only issued invoices can be marked as paid.');
		}
		this.db
			.prepare(`UPDATE invoices SET paid = ?, paid_at = ?, updated_at = ? WHERE id = ?`)
			.run(paid ? 1 : 0, paid ? paidAt?.trim() || nowIso() : null, nowIso(), id);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error('Payment update failed');
		}
		return updated;
	}

	/**
	 * Reverses an issued invoice the GoBD way: a real credit note (Gutschrift)
	 * with its own number is created as a draft, the original is marked
	 * cancelled and both are linked. The original is never deleted or edited.
	 *
	 * @param id - Issed invoice UUID to reverse.
	 * @param reason - Reason printed on the credit note.
	 * @returns The linked credit-note draft and the cancelled original.
	 */
	public reverseInvoice(id: string, reason?: string): { reversal: StoredInvoice; original: StoredInvoice } {
		const original = this.getInvoice(id);
		if (!original) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (original.status !== 'issued') {
			throw new Error('Only issued invoices can be reversed (Storno).');
		}
		const existing = this.listInvoices({ status: 'draft' }).find(draft => draft.stornoOfId === id);
		if (existing) {
			throw new Error(`A Storno draft for ${original.number} already exists (${existing.id}).`);
		}
		const reversal = this.createDraft({
			seller: original.seller,
			buyer: original.buyer,
			lines: original.lines,
			issueDate: todayIso(),
			deliveryDate: original.deliveryDate,
			dueDate: original.dueDate ?? undefined,
			currency: 'EUR',
			employeeCode: original.employeeCode ?? undefined,
			companyId: original.companyId,
			paymentTerms: original.paymentTerms ?? undefined,
			skontoPercent: original.skontoPercent,
			skontoDueDate: original.skontoDueDate ?? undefined,
			documentTitle: 'Gutschrift',
			notes: `Storno zu Rechnung ${original.number}${reason?.trim() ? ` – ${reason.trim()}` : ''}`,
		});
		const run = this.db.transaction((): { reversal: StoredInvoice; original: StoredInvoice } => {
			this.db
				.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'issued'`)
				.run(nowIso(), id);
			this.db
				.prepare(`UPDATE invoices SET storno_of_id = ?, updated_at = ? WHERE id = ?`)
				.run(id, nowIso(), reversal.id);
			const cancelled = this.getInvoice(id);
			if (!cancelled || cancelled.status !== 'cancelled') {
				throw new Error('Storno transaction failed');
			}
			// re-read: the link is only written inside the transaction
			const linked = this.getInvoice(reversal.id);
			if (!linked || linked.stornoOfId !== id) {
				throw new Error('Storno link failed');
			}
			return { reversal: linked, original: cancelled };
		});
		return run();
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
			.run(
				id,
				name.trim(),
				JSON.stringify({ ...stripCleared(definition), name: name.trim() }),
				hasAny ? 0 : 1,
				stamp,
				stamp,
			);
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
		const patchDef: Partial<LayoutTemplate> = patch.definition ?? {};
		// deep merge for the nested maps: a partial {blocks:{meta:false}} must not
		// drop the other block flags (validateTemplate would then reject it)
		const merged: LayoutTemplate = {
			...current.definition,
			...patchDef,
			blocks: { ...current.definition.blocks, ...(patchDef.blocks ?? {}) },
			colors: { ...current.definition.colors, ...(patchDef.colors ?? {}) },
			name: patchDef.name?.trim() || nextName,
		};
		// `null` clears an optional setting (a missing key would keep the stored value)
		const next = stripCleared(merged);
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
	 * Adds a file attachment to a draft.
	 *
	 * Only drafts may carry attachments: an issued invoice is frozen, and its
	 * PDF/XML already name the files (GoBD). Type, size and count come from
	 * `attachments.ts`, so no caller can bypass them.
	 *
	 * @param invoiceId - Owning invoice UUID.
	 * @param attachment - Filename, declared MIME type and content.
	 */
	public addAttachment(invoiceId: string, attachment: NewAttachment): StoredAttachment {
		const invoice = this.getInvoice(invoiceId);
		if (!invoice) {
			throw new Error(`Invoice not found: ${invoiceId}`);
		}
		if (invoice.status !== 'draft') {
			throw new Error('Only drafts can carry attachments; an issued invoice is frozen.');
		}
		const check = checkAttachment(attachment);
		if (!check.ok) {
			throw new Error(check.error);
		}
		if (this.countAttachments(invoiceId) >= ATTACHMENT_MAX_COUNT) {
			throw new Error(`At most ${ATTACHMENT_MAX_COUNT} attachments per invoice`);
		}
		const result = this.db
			.prepare(
				`INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
				VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(invoiceId, check.filename, check.mime, attachment.data.length, attachment.data, nowIso());
		const row = this.db
			.prepare(`SELECT * FROM attachments WHERE id = ?`)
			.get(result.lastInsertRowid) as AttachmentRow;
		return mapAttachment(row);
	}

	/**
	 * Lists attachments of one invoice including their content.
	 *
	 * Prefer `listAttachmentMeta` for listings: a PDF or an image can be several
	 * megabytes, and `SELECT *` would pull every BLOB into memory.
	 *
	 * @param invoiceId - Owning invoice UUID.
	 */
	public listAttachments(invoiceId: string): StoredAttachment[] {
		const rows = this.db
			.prepare(`SELECT * FROM attachments WHERE invoice_id = ? ORDER BY id ASC`)
			.all(invoiceId) as AttachmentRow[];
		return rows.map(mapAttachment);
	}

	/**
	 * Lists the attachments of one invoice without their content.
	 *
	 * @param invoiceId - Owning invoice UUID.
	 */
	public listAttachmentMeta(invoiceId: string): StoredAttachmentMeta[] {
		const rows = this.db
			.prepare(
				`SELECT id, invoice_id, filename, mime, size, created_at
				FROM attachments WHERE invoice_id = ? ORDER BY id ASC`,
			)
			.all(invoiceId) as AttachmentMetaRow[];
		return rows.map(mapAttachmentMeta);
	}

	/**
	 * Reads one attachment including its content.
	 *
	 * @param invoiceId - Owning invoice UUID.
	 * @param attachmentId - Row id of the attachment.
	 */
	public getAttachment(invoiceId: string, attachmentId: number): StoredAttachment | undefined {
		const row = this.db
			.prepare(`SELECT * FROM attachments WHERE id = ? AND invoice_id = ?`)
			.get(attachmentId, invoiceId) as AttachmentRow | undefined;
		return row ? mapAttachment(row) : undefined;
	}

	/**
	 * Counts the attachments of one invoice.
	 *
	 * @param invoiceId - Owning invoice UUID.
	 */
	public countAttachments(invoiceId: string): number {
		const row = this.db.prepare(`SELECT COUNT(*) AS n FROM attachments WHERE invoice_id = ?`).get(invoiceId) as {
			n: number;
		};
		return row.n;
	}

	/**
	 * Deletes one attachment of a draft.
	 *
	 * Issued invoices keep their attachments: the stored PDF/XML name them, so
	 * dropping one afterwards would break the frozen record (GoBD).
	 *
	 * @param invoiceId - Owning invoice UUID.
	 * @param attachmentId - Row id of the attachment.
	 */
	public deleteAttachment(invoiceId: string, attachmentId: number): void {
		const invoice = this.getInvoice(invoiceId);
		if (!invoice) {
			throw new Error(`Invoice not found: ${invoiceId}`);
		}
		if (invoice.status !== 'draft') {
			throw new Error('Only drafts can change attachments; an issued invoice is frozen.');
		}
		const result = this.db
			.prepare(`DELETE FROM attachments WHERE id = ? AND invoice_id = ?`)
			.run(attachmentId, invoiceId);
		if (result.changes === 0) {
			throw new Error(`Attachment not found: ${attachmentId}`);
		}
	}

	/**
	 * Exports the full database content for backups.
	 */
	public exportData(): DatabaseDump {
		const counters = this.db
			.prepare(
				`SELECT year, employee, doc_type, last_seq FROM counters ORDER BY year ASC, employee ASC, doc_type ASC`,
			)
			.all() as YearCounter[];
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
			invoices: this.allInvoices(),
			counters,
			templates: this.listTemplates(),
			companies: this.listCompanyProfiles(),
			customers: this.listCustomers(),
			products: this.listProducts(),
			dunningTexts: this.storedDunningTexts(),
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
	 * A collection missing from the dump is kept as-is instead of being
	 * wiped, so a partial/older backup can never destroy records silently.
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
		const has = (key: keyof DatabaseDump): boolean => Array.isArray(dump[key]);
		const run = this.db.transaction(() => {
			this.db.prepare(`DELETE FROM attachments`).run();
			this.db.prepare(`DELETE FROM invoices`).run();
			this.db.prepare(`DELETE FROM counters`).run();
			this.db.prepare(`DELETE FROM templates`).run();
			if (has('companies')) {
				this.db.prepare(`DELETE FROM company_profiles`).run();
			}
			if (has('customers')) {
				this.db.prepare(`DELETE FROM customers`).run();
			}
			if (has('products')) {
				this.db.prepare(`DELETE FROM products`).run();
			}
			if (has('dunningTexts')) {
				this.db.prepare(`DELETE FROM dunning_texts`).run();
				for (const row of dump.dunningTexts ?? []) {
					const errors = validateDunningPatch(row.level, row);
					if (errors.length > 0) {
						throw new Error(`Corrupt dunning text in dump: ${errors.join(' | ')}`);
					}
					this.db
						.prepare(
							`INSERT INTO dunning_texts (level, subject, body, days, deadline_days, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
						)
						.run(row.level, row.subject, row.body, row.days, row.deadlineDays, nowIso());
				}
			}
			// Counters are keyed by normalized employee code *and* document type,
			// but older databases may hold the same employee twice ("1" and "01"
			// both mean "01"). Merging by maximum keeps the sequence lückenlos
			// instead of aborting the whole restore with a UNIQUE violation.
			const mergedCounters = new Map<string, YearCounter>();
			for (const counter of dump.counters ?? []) {
				const employee = normalizeEmployeeCode((counter as { employee?: string }).employee ?? '00');
				// a pre-R8 dump has no doc_type at all — every row was an invoice
				const docType = normalizeDocumentType((counter as { doc_type?: string }).doc_type);
				const key = `${counter.year}/${employee}/${docType}`;
				const prev = mergedCounters.get(key);
				if (!prev || counter.last_seq > prev.last_seq) {
					mergedCounters.set(key, {
						year: counter.year,
						employee,
						doc_type: docType,
						last_seq: counter.last_seq,
					});
				}
			}
			for (const counter of mergedCounters.values()) {
				this.db
					.prepare(`INSERT INTO counters (year, employee, doc_type, last_seq) VALUES (?, ?, ?, ?)`)
					.run(counter.year, counter.employee, counter.doc_type, counter.last_seq);
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
					 profile, status, template_id, document_title, notes, payment_terms, employee_code, xml, pdf_path, xlsx_path,
					 paid, paid_at, storno_of_id, skonto_percent, skonto_due_date, sent_at, send_channel, payment_check,
					 payment_checked_at, reminded_at, reminder_level, retain_until, created_at, updated_at, doc_type,
					 valid_until, source_document_id, accepted_at, rejected_at, rejection_reason, template_snapshot_json, company_id)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
						invoice.paid ? 1 : 0,
						invoice.paidAt ?? null,
						invoice.stornoOfId ?? null,
						Number(invoice.skontoPercent) || 0,
						invoice.skontoDueDate ?? null,
						invoice.sentAt ?? null,
						invoice.sendChannel ?? null,
						invoice.paymentCheck ?? null,
						invoice.paymentCheckedAt ?? null,
						invoice.remindedAt ?? null,
						invoice.reminderLevel ?? 0,
						// a dump from before R8 has no retention date: recomputing it
						// keeps ten years of § 147 AO. A quotation never gets one.
						invoice.retainUntil ?? (isQuote(invoice.docType) ? null : retentionUntil(invoice.issueDate)),
						invoice.createdAt,
						invoice.updatedAt,
						normalizeDocumentType(invoice.docType),
						invoice.validUntil ?? null,
						invoice.sourceDocumentId ?? null,
						invoice.acceptedAt ?? null,
						invoice.rejectedAt ?? null,
						invoice.rejectionReason ?? null,
						invoice.templateSnapshot ? JSON.stringify(invoice.templateSnapshot) : null,
						invoice.companyId ?? null,
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
	 * Removes a backup from the log (its file was deleted by the retention).
	 *
	 * @param filename - File name as logged.
	 */
	public deleteBackupLog(filename: string): void {
		this.db.prepare(`DELETE FROM backups WHERE filename = ?`).run(filename);
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
	 * Records that an issued invoice's artifacts were re-rendered. The original
	 * file is archived rather than overwritten, so the delivered document stays
	 * reproducible (GoBD) while a corrected rendering becomes available.
	 *
	 * @param invoiceId - Issued invoice UUID.
	 * @param artifact - Which file was regenerated, e.g. `pdf`.
	 * @param previousPath - Path of the archived original, if any.
	 * @param newPath - Path of the freshly rendered file.
	 * @param reason - Free text, stored for the audit trail.
	 * @param layout - Which layout was used: `issued`, `current` or `current-unfrozen` (R7.8).
	 */
	public logRender(
		invoiceId: string,
		artifact: string,
		previousPath: string | null,
		newPath: string,
		reason: string | null,
		layout: string | null = null,
	): void {
		this.db
			.prepare(
				`INSERT INTO render_history (invoice_id, artifact, previous_path, new_path, reason, layout, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(invoiceId, artifact, previousPath, newPath, reason, layout, nowIso());
	}

	/**
	 * Lists the re-render history of an invoice, newest first.
	 *
	 * @param invoiceId - Issued invoice UUID.
	 */
	public listRenderHistory(invoiceId: string): RenderHistoryEntry[] {
		const rows = this.db
			.prepare(`SELECT * FROM render_history WHERE invoice_id = ? ORDER BY created_at DESC, id DESC`)
			.all(invoiceId) as {
			artifact: string;
			previous_path: string | null;
			new_path: string;
			reason: string | null;
			layout: string | null;
			created_at: string;
		}[];
		return rows.map(row => ({
			artifact: row.artifact,
			previousPath: row.previous_path,
			newPath: row.new_path,
			reason: row.reason,
			layout: row.layout ?? null,
			createdAt: row.created_at,
		}));
	}

	/**
	 * Stores one validation report. The JSON file itself is written by the API
	 * layer, so drafts (no number, no artifacts yet) and issued invoices share
	 * the same flow.
	 *
	 * @param invoiceId - Invoice UUID the report belongs to.
	 * @param reportPath - Storage-relative path of the JSON report.
	 * @param formatErrors - Number of technical (XSD) errors in this run.
	 * @param businessErrors - Number of business-rule findings in this run.
	 * @returns The running number used in the filename.
	 */
	public logValidationReport(
		invoiceId: string,
		reportPath: string,
		formatErrors: number,
		businessErrors: number,
	): number {
		const seq = this.nextValidationSeq(invoiceId);
		this.db
			.prepare(
				`INSERT INTO validation_reports (invoice_id, seq, report_path, format_errors, business_errors, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(invoiceId, seq, reportPath, formatErrors, businessErrors, nowIso());
		return seq;
	}

	/**
	 * Highest running number of an invoice's validation reports, 0 when none
	 * exists yet. Public because the API needs the same number for the file
	 * name it is about to write.
	 *
	 * @param invoiceId - Invoice UUID.
	 */
	public nextValidationSeq(invoiceId: string): number {
		const row = this.db
			.prepare(`SELECT MAX(seq) AS max_seq FROM validation_reports WHERE invoice_id = ?`)
			.get(invoiceId) as { max_seq: number | null };
		return (row.max_seq ?? 0) + 1;
	}

	/**
	 * Lists the stored validation reports of an invoice, newest first.
	 *
	 * @param invoiceId - Invoice UUID.
	 */
	public listValidationReports(invoiceId: string): ValidationReportEntry[] {
		const rows = this.db
			.prepare(`SELECT * FROM validation_reports WHERE invoice_id = ? ORDER BY seq DESC`)
			.all(invoiceId) as {
			seq: number;
			report_path: string;
			format_errors: number;
			business_errors: number;
			created_at: string;
		}[];
		return rows.map(row => ({
			seq: row.seq,
			reportPath: row.report_path,
			formatErrors: row.format_errors,
			businessErrors: row.business_errors,
			createdAt: row.created_at,
		}));
	}

	/**
	 * Deletes a draft. Issued, cancelled and Storno documents are never deleted:
	 * they are tax relevant and must stay reproducible (GoBD, § 147 AO).
	 *
	 * @param id - Draft UUID.
	 */
	public deleteDraft(id: string): void {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status !== 'draft') {
			throw new Error('Only drafts can be deleted. An issued invoice must be cancelled with a Storno.');
		}
		if (current.number) {
			// A consumed number must never be freed for reuse.
			throw new Error('This draft already carries a number and cannot be deleted.');
		}
		this.db.prepare(`DELETE FROM invoices WHERE id = ? AND status = 'draft'`).run(id);
	}

	/**
	 * Records the handover of an issued invoice to the customer.
	 *
	 * @param id - Issued invoice UUID.
	 * @param sentAt - ISO timestamp, default now.
	 * @param channel - Delivery channel, e.g. `E-Mail`.
	 */
	public markSent(id: string, sentAt: string, channel: string): StoredInvoice {
		const current = this.getInvoice(id);
		if (!current) {
			throw new Error(`Invoice not found: ${id}`);
		}
		if (current.status === 'draft') {
			throw new Error('Only issued invoices can be marked as sent.');
		}
		this.db
			.prepare(`UPDATE invoices SET sent_at = ?, send_channel = ?, updated_at = ? WHERE id = ?`)
			.run(sentAt, channel, nowIso(), id);
		return this.getInvoice(id) as StoredInvoice;
	}

	/**
	 * Stores the result of the § 16 Abs. 2 Nr. 2 UStG payment-method check.
	 *
	 * @param id - Issued invoice UUID.
	 * @param outcome - `passed`, `failed` or a free-text remark.
	 */
	public setPaymentCheck(id: string, outcome: string): StoredInvoice {
		this.db
			.prepare(`UPDATE invoices SET payment_check = ?, payment_checked_at = ?, updated_at = ? WHERE id = ?`)
			.run(outcome, nowIso(), nowIso(), id);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error(`Invoice not found: ${id}`);
		}
		return updated;
	}

	/**
	 * The dunning levels the user changed, as stored.
	 */
	public storedDunningTexts(): DunningTextRow[] {
		const rows = this.db.prepare(`SELECT * FROM dunning_texts ORDER BY level`).all() as {
			level: number;
			subject: string;
			body: string;
			days: number;
			deadline_days: number;
		}[];
		return rows.map(row => ({
			level: row.level,
			subject: row.subject,
			body: row.body,
			days: row.days,
			deadlineDays: row.deadline_days,
		}));
	}

	/**
	 * The three dunning levels: the user's text where one was saved, the built-in one else.
	 */
	public listDunningTexts(): DunningText[] {
		const stored = new Map(this.storedDunningTexts().map(row => [row.level, row]));
		return DEFAULT_DUNNING_TEXTS.map(fallback => {
			const row = stored.get(fallback.level);
			return row ? { ...row, isDefault: false } : { ...fallback };
		});
	}

	/**
	 * Changes one dunning level. The days must stay in rising order across the levels,
	 * otherwise the second level could be suggested before the first.
	 *
	 * @param level - Level 1 to 3.
	 * @param patch - Fields to change.
	 * @returns All three levels.
	 */
	public saveDunningText(level: number, patch: DunningTextPatch): DunningText[] {
		const errors = validateDunningPatch(level, patch);
		if (errors.length > 0) {
			throw new Error(`Invalid dunning text: ${errors.join(' | ')}`);
		}
		const levels = this.listDunningTexts();
		const current = levels.find(entry => entry.level === level)!;
		const next: DunningText = {
			...current,
			subject: typeof patch.subject === 'string' ? patch.subject.trim() : current.subject,
			body: typeof patch.body === 'string' ? patch.body.trim() : current.body,
			days: typeof patch.days === 'number' ? patch.days : current.days,
			deadlineDays: typeof patch.deadlineDays === 'number' ? patch.deadlineDays : current.deadlineDays,
			isDefault: false,
		};
		const before = levels.find(entry => entry.level === level - 1);
		const after = levels.find(entry => entry.level === level + 1);
		if ((before && next.days <= before.days) || (after && next.days >= after.days)) {
			throw new Error('Invalid dunning text: the days must rise from level to level');
		}
		this.db
			.prepare(
				`INSERT INTO dunning_texts (level, subject, body, days, deadline_days, updated_at) VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(level) DO UPDATE SET subject = excluded.subject, body = excluded.body, days = excluded.days,
				 deadline_days = excluded.deadline_days, updated_at = excluded.updated_at`,
			)
			.run(level, next.subject, next.body, next.days, next.deadlineDays, nowIso());
		return this.listDunningTexts();
	}

	/**
	 * Takes a level back to the built-in text.
	 *
	 * @param level - Level 1 to 3.
	 * @returns All three levels.
	 */
	public resetDunningText(level: number): DunningText[] {
		if (!Number.isInteger(level) || level < 1 || level > MAX_DUNNING_LEVEL) {
			throw new Error(`Invalid dunning text: level must be 1 to ${MAX_DUNNING_LEVEL}`);
		}
		this.db.prepare(`DELETE FROM dunning_texts WHERE level = ?`).run(level);
		return this.listDunningTexts();
	}

	/**
	 * Counts and remembers a dunning step.
	 *
	 * @param id - Issued invoice UUID.
	 * @param on - Reference day, used for the "already reminded today" check.
	 */
	public registerReminder(id: string, on: string = todayIso()): StoredInvoice {
		this.db
			.prepare(
				`UPDATE invoices SET reminder_level = reminder_level + 1, reminded_at = ?, updated_at = ? WHERE id = ?`,
			)
			.run(`${on}T00:00:00.000Z`, nowIso(), id);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error(`Invoice not found: ${id}`);
		}
		return updated;
	}

	/**
	 * Sets the earliest legal deletion date (§ 147 AO / § 14b UStG, 10 years).
	 *
	 * @param id - Issued invoice UUID.
	 * @param issueDate - ISO issue date the period starts from.
	 */
	public setRetention(id: string, issueDate: string): StoredInvoice {
		const until = retentionUntil(issueDate);
		this.db.prepare(`UPDATE invoices SET retain_until = ? WHERE id = ?`).run(until, id);
		const updated = this.getInvoice(id);
		if (!updated) {
			throw new Error(`Invoice not found: ${id}`);
		}
		return updated;
	}

	/**
	 * Creates a reusable invoice content template (recurring maintenance, flat
	 * fees, ...). The buyer is left empty on purpose: a template describes the
	 * positions, the customer is picked per invoice.
	 *
	 * @param name - Display name.
	 * @param body - Draft content to reuse.
	 */
	public createInvoiceTemplate(name: string, body: InvoiceDraftInput): StoredInvoiceTemplate {
		if (!name.trim()) {
			throw new Error('Template needs a name');
		}
		const id = randomUUID();
		const stamp = nowIso();
		this.db
			.prepare(
				`INSERT INTO invoice_templates (id, name, body_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
			)
			.run(id, name, JSON.stringify(body), stamp, stamp);
		return { id, name, body, createdAt: stamp, updatedAt: stamp };
	}

	/**
	 * Lists invoice content templates by name.
	 */
	public listInvoiceTemplates(): StoredInvoiceTemplate[] {
		const rows = this.db.prepare(`SELECT * FROM invoice_templates ORDER BY name ASC`).all() as {
			id: string;
			name: string;
			body_json: string;
			created_at: string;
			updated_at: string;
		}[];
		return rows.map(row => ({
			id: row.id,
			name: row.name,
			body: parseJson(row.body_json, 'invoice template'),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));
	}

	/**
	 * Updates an invoice content template.
	 *
	 * @param id - Template UUID.
	 * @param patch - New name and/or body.
	 * @param patch.name - New display name.
	 * @param patch.body - New draft content.
	 * @returns The updated template.
	 */
	public updateInvoiceTemplate(
		id: string,
		patch: { name?: string; body?: InvoiceDraftInput },
	): StoredInvoiceTemplate {
		if (!this.getInvoiceTemplate(id)) {
			throw new Error(`Template not found: ${id}`);
		}
		if (patch.name !== undefined) {
			if (!patch.name.trim()) {
				throw new Error('Template needs a name');
			}
			this.db.prepare(`UPDATE invoice_templates SET name = ? WHERE id = ?`).run(patch.name, id);
		}
		if (patch.body !== undefined) {
			this.db
				.prepare(`UPDATE invoice_templates SET body_json = ? WHERE id = ?`)
				.run(JSON.stringify(patch.body), id);
		}
		this.db.prepare(`UPDATE invoice_templates SET updated_at = ? WHERE id = ?`).run(nowIso(), id);
		return this.getInvoiceTemplate(id) as StoredInvoiceTemplate;
	}

	/**
	 * Loads one invoice content template.
	 *
	 * @param id - Template UUID.
	 */
	public getInvoiceTemplate(id: string): StoredInvoiceTemplate | null {
		const row = this.db.prepare(`SELECT * FROM invoice_templates WHERE id = ?`).get(id) as
			{ id: string; name: string; body_json: string; created_at: string; updated_at: string } | undefined;
		if (!row) {
			return null;
		}
		return {
			id: row.id,
			name: row.name,
			body: parseJson(row.body_json, 'invoice template'),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	/**
	 * Deletes an invoice content template. Issued invoices keep their own copy
	 * of the content, so deleting a template never changes a document.
	 *
	 * @param id - Template UUID.
	 */
	public deleteInvoiceTemplate(id: string): void {
		if (!this.getInvoiceTemplate(id)) {
			throw new Error(`Template not found: ${id}`);
		}
		this.db.prepare(`DELETE FROM invoice_templates WHERE id = ?`).run(id);
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
		// BT-10 is mandatory in the German profile; a customer created here
		// gets one automatically unless the user brought their own scheme
		const withNumber: Party = {
			...profile,
			customerNumber: profile.customerNumber?.trim() || this.nextCustomerNumber(),
		};
		this.db
			.prepare(`INSERT INTO customers (id, name, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
			.run(id, name.trim(), JSON.stringify(withNumber), stamp, stamp);
		const created = this.getCustomer(id);
		if (!created) {
			throw new Error('Customer was not stored');
		}
		return created;
	}

	/**
	 * Reserves the next automatic customer number. Kept in sync with the
	 * numbers already in use, so a restore or a hand-edited number cannot
	 * cause a collision.
	 *
	 * @returns The new number.
	 */
	public nextCustomerNumber(): string {
		const used = new Set(
			this.listCustomers()
				.map(customer => customer.profile.customerNumber?.trim())
				.filter((value): value is string => !!value),
		);
		const row = this.db.prepare(`SELECT last_seq FROM customer_counters WHERE name = 'default'`).get() as
			{ last_seq: number } | undefined;
		let seq = row?.last_seq ?? 0;
		let candidate = formatCustomerNumber(seq + 1);
		// skip anything a user already assigned by hand
		while (used.has(candidate)) {
			seq += 1;
			candidate = formatCustomerNumber(seq + 1);
		}
		this.db
			.prepare(
				`INSERT INTO customer_counters (name, last_seq) VALUES ('default', ?)
				 ON CONFLICT(name) DO UPDATE SET last_seq = excluded.last_seq`,
			)
			.run(seq + 1);
		return candidate;
	}

	/**
	 * Assigns numbers to customers that predate the automatic numbering
	 * (existing records, restored backups). Numbers already present are kept.
	 *
	 * @returns The customers that received a new number.
	 */
	public assignMissingCustomerNumbers(): StoredCustomer[] {
		const changed: StoredCustomer[] = [];
		for (const customer of this.listCustomers()) {
			if (customer.profile.customerNumber?.trim()) {
				continue;
			}
			const updated = this.updateCustomer(customer.id, {
				name: customer.name,
				profile: { ...customer.profile, customerNumber: this.nextCustomerNumber() },
			});
			changed.push(updated);
		}
		return changed;
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
	 * Lists customers by name, optionally filtered by a fuzzy search term.
	 *
	 * @param query - Search term; typos and case differences are tolerated.
	 */
	public listCustomers(query?: string): StoredCustomer[] {
		const all = this.db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all() as CustomerRow[];
		const mapped = all.map(mapCustomerRow);
		const needle = (query ?? '').trim();
		if (!needle) {
			return mapped;
		}
		return rankCustomers(mapped, needle);
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
