/** Typed client for the adapter /api (same origin, served on :8093). */
import { t } from './i18n';

/** A party (seller, buyer, company or customer) as the API sends it. */
export interface Party {
	/** Name. */
	name: string;
	/** Street and house number. */
	street: string;
	/** Postal code. */
	zip: string;
	/** City. */
	city: string;
	/** Country code (ISO 3166-1 alpha-2). */
	country: string;
	/** VAT identification number. */
	vatId?: string;
	/** National tax number. */
	taxNumber?: string;
	/** E-mail address. */
	email?: string;
	/** Phone number. */
	phone?: string;
	/** Website. */
	website?: string;
	/** Customer number (BT-10). */
	customerNumber?: string;
	/** Contact person. */
	contactName?: string;
	/** Name of the bank. */
	bankName?: string;
	/** Footer boxes of the print layout. */
	footerBoxes?: string[];
	/** Alignment of the footer boxes. */
	footerAlign?: ('left' | 'center' | 'right')[];
	/** IBAN. */
	iban?: string;
	/** BIC. */
	bic?: string;
}

/** One line of a document. */
export interface InvoiceLine {
	/** Text of the position. */
	description: string;
	/** Article number. */
	sku?: string;
	/** Additional details. */
	details?: string;
	/** Quantity. */
	quantity: number;
	/** Unit, e.g. Stk or Std. */
	unit: string;
	/** Net unit price in EUR. */
	unitPriceNet: number;
	/** VAT rate in percent. */
	vatRate: number;
	/** Reason for a tax exemption. */
	exemptionReason?: string;
	/** Tax category of a 0 % line. */
	exemptionCategory?: 'E' | 'AE' | 'K' | 'G' | 'O';
	/** Line discount in percent. */
	discountPercent?: number;
}

/** Computed totals of a document. */
export interface InvoiceTotals {
	/** Net total in EUR. */
	netTotal: number;
	/** VAT total in EUR. */
	taxTotal: number;
	/** Gross total in EUR. */
	grossTotal: number;
	/** Breakdown per VAT rate. */
	breakdown: {
		/** VAT rate in percent. */
		vatRate: number;
		/** Net amount in EUR. */
		net: number;
		/** VAT amount in EUR. */
		tax: number;
		/** Gross amount in EUR. */
		gross: number;
	}[];
}

/** A document as the API returns it. */
export interface Invoice {
	/** UUID. */
	id: string;
	/** Document number, null for a draft. */
	number: string | null;
	/** ISO issue date. */
	issueDate: string;
	/** ISO delivery date or period. */
	deliveryDate: string;
	/** ISO due date. */
	dueDate: string | null;
	/** Seller. */
	seller: Party;
	/** Buyer. */
	buyer: Party;
	/** Lines of the document. */
	lines: InvoiceLine[];
	/** Computed totals. */
	totals: InvoiceTotals;
	/** ZUGFeRD profile or party data. */
	profile: string;
	/** Life cycle status. */
	status: 'draft' | 'issued' | 'cancelled';
	/** Id of the print template. */
	templateId: string | null;
	/** R6.3: company profile the document was written for, null for older documents. */
	companyId?: string | null;
	/** The layout the document was issued with, frozen (R7.8); null for older documents. */
	templateSnapshot?: {
		/** Name of the template at the time. */
		templateName: string;
		/** Version of the template at the time. */
		templateVersion: number | null;
		/** ISO timestamp of the freeze. */
		frozenAt: string;
	} | null;
	/** Employee code of the number circle. */
	employeeCode: string | null;
	/** Title shown on the document. */
	documentTitle: string;
	/** Free-text notes. */
	notes: string | null;
	/** Payment terms text. */
	paymentTerms: string | null;
	/** The CII XML, null until issued. */
	xml: string | null;
	/** Path of the PDF in the storage. */
	pdfPath: string | null;
	/** Path of the Excel copy in the storage. */
	xlsxPath: string | null;
	/** True when the invoice was paid. */
	paid: boolean;
	/** ISO date of the payment. */
	paidAt: string | null;
	/** Id of the invoice a Storno reverses. */
	stornoOfId: string | null;
	/** R8: `invoice` or `quote` — the type decides number circle and artifacts. */
	docType: string;
	/** R8: last day an offer stands, null for an invoice. */
	validUntil: string | null;
	/** R8: offer this invoice was converted from, null when standalone. */
	sourceDocumentId: string | null;
	/** R8: when the customer accepted the offer, null while undecided. */
	acceptedAt: string | null;
	/** R8: when the customer declined the offer, null while undecided. */
	rejectedAt: string | null;
	/** R8: free-text reason of a rejection. */
	rejectionReason: string | null;
	/** Cash discount in percent. */
	skontoPercent: number;
	/** Last day for the cash discount. */
	skontoDueDate: string | null;
	/** ISO time of the handover to the customer, null while unsent. */
	sentAt: string | null;
	/** Delivery channel, e.g. `E-Mail`. */
	sendChannel: string | null;
	/** § 16 Abs. 2 Nr. 2 UStG check outcome. */
	paymentCheck: string | null;
	/** When the payment method was checked. */
	paymentCheckedAt: string | null;
	/** Last dunning step. */
	remindedAt: string | null;
	/** Reminders already marked. */
	reminderLevel: number;
	/** Earliest legal deletion date (§ 147 AO). */
	retainUntil: string | null;
	/** ISO creation timestamp. */
	createdAt: string;
	/** ISO timestamp of the last change. */
	updatedAt: string;
}

/** Content of a draft that is created or changed. */
export interface DraftInput {
	/** Seller. */
	seller: Party;
	/** Buyer. */
	buyer: Party;
	/** Lines of the document. */
	lines: InvoiceLine[];
	/** ISO issue date. */
	issueDate: string;
	/** ISO delivery date or period. */
	deliveryDate: string;
	/** ISO due date. */
	dueDate?: string;
	/** Currency, EUR only. */
	currency?: string;
	/** Employee code of the number circle. */
	employeeCode?: string;
	/** Title shown on the document. */
	documentTitle?: string;
	/** Free-text notes. */
	notes?: string;
	/** Payment terms text. */
	paymentTerms?: string;
	/** Cash discount in percent. */
	skontoPercent?: number;
	/** Last day for the cash discount. */
	skontoDueDate?: string;
	/** R8: `invoice` (default) or `quote` — decides number circle and artifacts. */
	docType?: string;
	/** R8: last day an offer stands (ISO date), only used for offers. */
	validUntil?: string;
	/** R6.3: company profile the document is written for; null unbinds it. */
	companyId?: string | null;
}

/** A company profile. */
export interface CompanyProfile {
	/** UUID. */
	id: string;
	/** Name. */
	name: string;
	/** Data of the party. */
	profile: Party;
	/** True for the default entry. */
	isDefault: boolean;
}

/** A catalog product. */
export interface Product {
	/** UUID. */
	id: string;
	/** Article number. */
	sku: string;
	/** Name. */
	name: string;
	/** Additional details. */
	details: string;
	/** Unit, e.g. Stk or Std. */
	unit: string;
	/** Net unit price in EUR. */
	unitPriceNet: number;
	/** VAT rate in percent. */
	vatRate: number;
}

/** Result of a validation run. */
export interface ValidationOutcome {
	/** Number of schema (format) errors. */
	formatErrors: string[];
	/** Number of business rule errors. */
	businessErrors: string[];
	/** Report of this run as stored next to the artifacts, null when the file failed. */
	report: {
		/** Sequence number. */
		seq: number;
		/** Path in the storage. */
		path: string;
		/** ISO creation timestamp. */
		createdAt: string;
	} | null;
}

/** One stored validation report (R2). */
export interface ValidationReport {
	/** Sequence number. */
	seq: number;
	/** Path of the stored report. */
	reportPath: string;
	/** Number of schema (format) errors. */
	formatErrors: number;
	/** Number of business rule errors. */
	businessErrors: number;
	/** ISO creation timestamp. */
	createdAt: string;
}

/** § 16 Abs. 2 Nr. 2 UStG: whether the payment method has to be checked. */
export interface PaymentCheckDuty {
	/** True when the check is legally required. */
	required: boolean;
	/** Human-readable reason, empty when not required. */
	reason: string;
	/** Whole days the invoice is overdue. */
	overdueDays: number;
}

/** Age bucket of an open item (R6.2). */
export type AgeBucket = 'notDue' | 'd1to30' | 'd31to60' | 'd61to90' | 'over90';

/** One unpaid invoice with its age. */
export interface OpenItem {
	/** UUID. */
	id: string;
	/** Document number, null for a draft. */
	number: string;
	/** Customer name. */
	customer: string;
	/** Customer number (BT-10). */
	customerNumber: string;
	/** ISO issue date. */
	issueDate: string;
	/** ISO due date. */
	dueDate: string;
	/** Amount in EUR. */
	amount: number;
	/** Days past the due date. */
	overdueDays: number;
	/** Age bucket. */
	bucket: AgeBucket;
	/** Cash discount in percent. */
	skontoPercent: number;
	/** Reminders already marked. */
	reminderLevel: number;
	/** True when handed to the customer. */
	sent: boolean;
}

/** Count and sum of a group. */
export interface OpenSubtotal {
	/** Number of entries. */
	count: number;
	/** Amount in EUR. */
	amount: number;
}

/** The evaluation of `GET /api/open-items`. */
export interface OpenItemsReport {
	/** Reference day. */
	asOf: string;
	/** Only overdue items. */
	onlyOverdue: boolean;
	/** Entries. */
	items: OpenItem[];
	/** Count and sum per age bucket. */
	buckets: Record<AgeBucket, OpenSubtotal>;
	/** Total. */
	total: OpenSubtotal;
	/** Overdue part. */
	overdue: OpenSubtotal;
	/** Sums per customer. */
	customers: (OpenSubtotal & { customer: string; customerNumber: string })[];
}

/** Filters of the open-items routes. */
export interface OpenItemsParams {
	/** Reference day. */
	asOf?: string;
	/** Only overdue items. */
	onlyOverdue?: boolean;
}

/**
 * Query string of an open-items request.
 *
 * @param params - Filters.
 */
function openItemsQuery(params: OpenItemsParams): string {
	const query = new URLSearchParams();
	if (params.asOf) {
		query.set('asOf', params.asOf);
	}
	if (params.onlyOverdue) {
		query.set('onlyOverdue', '1');
	}
	const text = query.toString();
	return text ? `?${text}` : '';
}

/** Revenue of one company (R6.3). */
export interface CompanyRevenue {
	/** Company profile id, null for documents without a company. */
	companyId: string | null;
	/** Company name. */
	company: string;
	/** Number of invoices. */
	count: number;
	/** Net sum in EUR. */
	net: number;
	/** VAT sum in EUR. */
	tax: number;
	/** Gross sum in EUR. */
	gross: number;
}

/** The evaluation of `GET /api/reports/revenue-by-company`. */
export interface RevenueReport {
	/** Year the report is limited to, null = all years. */
	year: number | null;
	/** One row per company. */
	rows: CompanyRevenue[];
	/** Sum over all rows. */
	total: { count: number; net: number; tax: number; gross: number };
}

/** One level of the dunning process (R6.4). */
export interface DunningText {
	/** 1 = reminder, 2 = first, 3 = second dunning letter. */
	level: number;
	/** Subject line with placeholders. */
	subject: string;
	/** Body with placeholders. */
	body: string;
	/** Overdue days from which the level is suggested. */
	days: number;
	/** Payment deadline in days. */
	deadlineDays: number;
	/** True for the built-in text. */
	isDefault: boolean;
}

/** The next dunning step of one invoice, text filled in (R6.4). */
export interface DunningSuggestion {
	/** Invoice UUID. */
	invoiceId: string;
	/** Invoice number. */
	number: string;
	/** Customer name. */
	customer: string;
	/** Customer e-mail, empty when unknown. */
	email: string;
	/** Level of this step. */
	level: number;
	/** Days past the due date. */
	overdueDays: number;
	/** Open gross amount in EUR. */
	amount: number;
	/** ISO due date. */
	dueDate: string;
	/** ISO payment deadline of the letter. */
	deadline: string;
	/** Skonto still possible. */
	skontoActive: boolean;
	/** Subject, ready to send. */
	subject: string;
	/** Letter text, ready to send. */
	text: string;
}

/** One issued invoice that is overdue and due for a dunning reminder. */
export interface ReminderCandidate {
	/** The invoice itself. */
	invoice: Invoice;
	/** Whole days overdue. */
	overdueDays: number;
	/** Reminders already sent. */
	level: number;
	/** Skonto is still available, so the reminder must mention the discount. */
	skontoActive: boolean;
}

/** Reusable invoice content, e.g. a monthly maintenance invoice. */
export interface InvoiceTemplate {
	/** Template UUID. */
	id: string;
	/** Display name. */
	name: string;
	/** Draft content reused for new invoices. */
	body: Record<string, unknown>;
}

/** What a restore would change, without writing anything. */
export interface RestorePreview {
	/** Invoice count in the backup. */
	invoices: number;
	/** Issued invoices among them. */
	issued: number;
	/** Invoice count currently in the database. */
	currentInvoices: number;
	/** Numbers that would be overwritten by this backup. */
	overwritten: string[];
	/** Numbers that only exist here and would be new. */
	added: string[];
	/** Numbers that exist only in the current database and would be removed from it. */
	onlyHere: string[];
	/** Counters that are ahead of the backup; they are kept, so no number is reused. */
	counterAhead: string[];
	/** Files that would be written. */
	filesWritten: number;
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
	/** Layout used: `issued`, `current`, `current-unfrozen`; null for older entries. */
	layout?: string | null;
	/** ISO timestamp. */
	createdAt: string;
}

/** One stored attachment of an invoice (without its content, R4). */
export interface AttachmentMeta {
	/** Row id, used in the download URL. */
	id: number;
	/** Owning invoice UUID. */
	invoiceId: string;
	/** Stored filename. */
	filename: string;
	/** MIME type taken from the content (magic bytes). */
	mime: string;
	/** Size in bytes. */
	size: number;
	/** ISO timestamp of the upload. */
	createdAt: string;
}

/** API token storage (localStorage, set on the login page). */
const TOKEN_KEY = 'einv-token';

/** Reads the API token stored in this browser. */
export function getToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

/**
 * Stores or clears the API token in this browser.
 *
 * @param token - The token, null to clear it.
 */
export function setToken(token: string | null): void {
	try {
		if (token) {
			localStorage.setItem(TOKEN_KEY, token);
		} else {
			localStorage.removeItem(TOKEN_KEY);
		}
	} catch {
		// storage blocked — session only
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await apiFetch(path, {
		headers: { 'content-type': 'application/json' },
		...init,
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? `HTTP ${res.status}`);
	}
	return (await res.json()) as T;
}

/**
 * fetch with API token and login redirect on 401 (for calls that need
 * the raw Response, e.g. PDF blobs or manual error handling).
 *
 * @param path - Same-origin API path.
 * @param init - fetch options.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) };
	const token = getToken();
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}
	const res = await fetch(path, { ...init, headers });
	if (res.status === 401) {
		if (!location.hash.startsWith('#/login')) {
			location.hash = '#/login';
		}
		throw new Error(t('Nicht angemeldet — bitte Token auf der Login-Seite eintragen'));
	}
	return res;
}

/**
 * Downloads an API file with token auth (plain anchors send no
 * Authorization header, so they fail with 401 when a token is set).
 * Fetches as blob and triggers a same-page download — no blank tab.
 *
 * @param url - Same-origin API file URL.
 * @param fallbackName - Filename when the server sends none.
 */
export async function downloadUrl(url: string, fallbackName: string): Promise<void> {
	const res = await apiFetch(url);
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? t('Download fehlgeschlagen (HTTP {status})', { status: res.status }));
	}
	const blob = await res.blob();
	const match = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '');
	const anchor = document.createElement('a');
	anchor.href = URL.createObjectURL(blob);
	anchor.download = match?.[1] ?? fallbackName;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	window.setTimeout(() => URL.revokeObjectURL(anchor.href), 10000);
}

/**
 * Opens an API file in a new tab with token auth (blob URL, since a
 * plain navigation would carry no Authorization header either).
 *
 * @param url - Same-origin API file URL.
 */
export async function openUrl(url: string): Promise<void> {
	const res = await apiFetch(url);
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? t('Öffnen fehlgeschlagen (HTTP {status})', { status: res.status }));
	}
	const blob = await res.blob();
	const obj = URL.createObjectURL(blob);
	window.open(obj, '_blank', 'noopener');
	window.setTimeout(() => URL.revokeObjectURL(obj), 60000);
}

/**
 * Query string of an accounting export.
 *
 * R8: pinned to invoices unless the caller asks otherwise — an export must
 * never mix A-numbers into the booking list by accident, and the type is data
 * on the record, not a matter of remembering the parameter.
 *
 * @param params - Filters of the export (status, q, year, …).
 */
function exportQuery(params: Record<string, string>): string {
	return new URLSearchParams({ docType: 'invoice', ...params }).toString();
}

export const api = {
	health: () =>
		request<{
			/** Life cycle status. */
			status: string;
			/** Version. */
			version: string;
			/** Database schema version. */
			schemaVersion: number;
			/** Counts per status. */
			counts: Record<string, number>;
			/** Start language chosen in the admin (`auto`, `de`, `en`); public so the login page can use it. */
			pwaLanguage?: string;
		}>('/api/health'),
	settings: () =>
		request<{
			/** Default VAT rate. */
			defaultVatRate: number;
			/** Default payment terms. */
			defaultPaymentTerms: string;
			/** Invoice number format. */
			numberFormat: string;
			/** Offer number format. */
			quoteNumberFormat: string;
			/** Name of the storage mount. */
			storageMount: string;
			/** Automatic backup interval in minutes. */
			backupIntervalMinutes: number;
			/** Language setting of the web app. */
			pwaLanguage: string;
		}>('/api/settings'),
	list: (params: Record<string, string> = {}) => {
		const q = new URLSearchParams(params).toString();
		return request<Invoice[]>(`/api/invoices${q ? `?${q}` : ''}`);
	},
	get: (id: string) => request<Invoice>(`/api/invoices/${id}`),
	create: (input: DraftInput) => request<Invoice>('/api/invoices', { method: 'POST', body: JSON.stringify(input) }),
	update: (id: string, patch: Partial<DraftInput>) =>
		request<Invoice>(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
	issue: (id: string) => request<Invoice>(`/api/invoices/${id}/issue`, { method: 'POST' }),
	issueBatch: (ids: string[]) =>
		request<{
			/** Documents issued. */
			issued: Invoice[];
			/** Documents that failed. */
			failed: {
				/** UUID. */
				id: string;
				/** Error message. */
				error: string;
			}[];
		}>('/api/invoices/issue-batch', {
			method: 'POST',
			body: JSON.stringify({ ids }),
		}),
	/**
	 * Deletes a draft. Issued invoices must be cancelled with a Storno.
	 *
	 * @param id - UUID of the entry.
	 */
	deleteDraft: (id: string) => request<void>(`/api/invoices/${id}`, { method: 'DELETE' }),
	/**
	 * Records the handover of an issued invoice to the customer.
	 *
	 * @param id - UUID of the entry.
	 * @param channel - Channel the invoice was handed over by.
	 */
	markSent: (id: string, channel?: string) =>
		request<Invoice>(`/api/invoices/${id}/sent`, {
			method: 'POST',
			body: JSON.stringify({ channel }),
		}),
	/**
	 * Reports the § 16 Abs. 2 Nr. 2 UStG duty, or stores the outcome when one
	 * is passed.
	 *
	 * @param id - UUID of the entry.
	 * @param outcome - Result of the payment-method check.
	 */
	paymentCheck: (id: string, outcome?: string) =>
		request<{
			/** The invoice. */
			invoice: Invoice;
			/** Whether the payment method has to be checked. */
			duty: PaymentCheckDuty;
			/** True when it was checked. */
			checked: boolean;
		}>(`/api/invoices/${id}/payment-check`, {
			method: 'POST',
			body: JSON.stringify({ outcome }),
		}),
	/**
	 * Open items (OPOS) with age buckets and sums.
	 *
	 * @param params - Reference day and the overdue filter.
	 */
	openItems: (params: OpenItemsParams = {}) => request<OpenItemsReport>(`/api/open-items${openItemsQuery(params)}`),
	openItemsCsvUrl: (params: OpenItemsParams = {}) => `/api/open-items.csv${openItemsQuery(params)}`,
	openItemsXlsxUrl: (params: OpenItemsParams = {}) => `/api/open-items.xlsx${openItemsQuery(params)}`,
	/**
	 * Revenue per company (R6.3).
	 *
	 * @param year - Limit to this year, empty = all years.
	 */
	revenue: (year?: number) => request<RevenueReport>(`/api/reports/revenue-by-company${year ? `?year=${year}` : ''}`),
	revenueCsvUrl: (year?: number) => `/api/reports/revenue-by-company.csv${year ? `?year=${year}` : ''}`,
	revenueXlsxUrl: (year?: number) => `/api/reports/revenue-by-company.xlsx${year ? `?year=${year}` : ''}`,
	dunning: {
		texts: () => request<DunningText[]>('/api/dunning/texts'),
		saveText: (level: number, patch: Partial<Pick<DunningText, 'subject' | 'body' | 'days' | 'deadlineDays'>>) =>
			request<DunningText[]>(`/api/dunning/texts/${level}`, { method: 'PUT', body: JSON.stringify(patch) }),
		resetText: (level: number) => request<DunningText[]>(`/api/dunning/texts/${level}`, { method: 'DELETE' }),
		suggestions: () => request<DunningSuggestion[]>('/api/dunning/suggestions'),
		csvUrl: () => '/api/dunning/suggestions.csv',
		pdfUrl: () => '/api/dunning/suggestions.pdf',
	},
	reminders: () => request<ReminderCandidate[]>('/api/reminders'),
	reminded: (id: string) => request<Invoice>(`/api/invoices/${id}/reminded`, { method: 'POST' }),
	invoiceTemplates: {
		list: () => request<InvoiceTemplate[]>('/api/invoice-templates'),
		create: (name: string, body: unknown) =>
			request<InvoiceTemplate>('/api/invoice-templates', {
				method: 'POST',
				body: JSON.stringify({ name, body }),
			}),
		update: (
			id: string,
			patch: {
				/** Name. */
				name?: string;
				/** Body of the entry. */
				body?: unknown;
			},
		) =>
			request<InvoiceTemplate>(`/api/invoice-templates/${id}`, {
				method: 'PUT',
				body: JSON.stringify(patch),
			}),
		remove: (id: string) => request<void>(`/api/invoice-templates/${id}`, { method: 'DELETE' }),
	},
	setPaid: (id: string, paid: boolean, paidAt?: string) =>
		request<Invoice>(`/api/invoices/${id}/paid`, {
			method: 'POST',
			body: JSON.stringify({ paid, paidAt }),
		}),
	storno: (id: string, reason?: string) =>
		request<{
			/** The credit note. */
			reversal: Invoice;
			/** The reversed original. */
			original: Invoice;
		}>(`/api/invoices/${id}/storno`, {
			method: 'POST',
			body: JSON.stringify({ reason }),
		}),
	validate: (id: string) => request<ValidationOutcome>(`/api/invoices/${id}/validate`, { method: 'POST' }),
	/**
	 * R8: records the customer's "yes" — the first decision counts.
	 *
	 * @param id - UUID of the entry.
	 * @param at - ISO date.
	 */
	quoteAccept: (id: string, at?: string) =>
		request<Invoice>(`/api/invoices/${id}/quote-accept`, {
			method: 'POST',
			body: JSON.stringify({ at }),
		}),
	/**
	 * R8: records the customer's "no", with a free-text reason.
	 *
	 * @param id - UUID of the entry.
	 * @param reason - Free-text reason, stored for the audit trail.
	 */
	quoteReject: (id: string, reason?: string) =>
		request<Invoice>(`/api/invoices/${id}/quote-reject`, {
			method: 'POST',
			body: JSON.stringify({ reason }),
		}),
	/**
	 * R8: turns an offer into an invoice *draft* — the number falls on issue.
	 * `requireAccepted: false` covers the deal agreed by phone.
	 *
	 * @param id - UUID of the entry.
	 * @param requireAccepted - Only convert an accepted offer.
	 */
	convert: (id: string, requireAccepted = true) =>
		request<Invoice>(`/api/invoices/${id}/convert`, {
			method: 'POST',
			body: JSON.stringify({ requireAccepted }),
		}),
	/**
	 * Copies the content of an invoice into a new template (no customer, no dates).
	 *
	 * @param id - UUID of the entry.
	 * @param name - Display name.
	 */
	asTemplate: (id: string, name: string) =>
		request<InvoiceTemplate>(`/api/invoices/${id}/as-template`, {
			method: 'POST',
			body: JSON.stringify({ name }),
		}),
	rerender: (id: string, reason?: string, layout?: 'issued' | 'current') =>
		request<{
			/** The invoice. */
			invoice: Invoice;
			/** Path of the archived original. */
			archivedPath: string | null;
		}>(`/api/invoices/${id}/rerender`, {
			method: 'POST',
			body: JSON.stringify({ reason, layout }),
		}),
	renders: (id: string) => request<RenderHistoryEntry[]>(`/api/invoices/${id}/renders`),
	/**
	 * Reports of earlier validation runs, newest first (R2).
	 *
	 * @param id - UUID of the entry.
	 */
	validationReports: (id: string) => request<ValidationReport[]>(`/api/invoices/${id}/validation`),
	/**
	 * Download URL of one stored validation report.
	 *
	 * @param id - UUID of the entry.
	 * @param seq - Sequence number of the report.
	 */
	validationReportUrl: (id: string, seq: number) => `/api/invoices/${id}/validation/${seq}.json`,
	/**
	 * R4: attachments of a draft. Listing never carries the content; the files
	 * are uploaded as base64 JSON (no multipart) and downloaded one by one.
	 */
	attachments: {
		list: (id: string) => request<AttachmentMeta[]>(`/api/invoices/${id}/attachments`),
		add: (
			id: string,
			file: {
				/** File name. */
				filename: string;
				/** MIME type. */
				mime: string;
				/** File content, base64 encoded. */
				dataBase64: string;
			},
		) =>
			request<AttachmentMeta>(`/api/invoices/${id}/attachments`, {
				method: 'POST',
				body: JSON.stringify(file),
			}),
		remove: (id: string, attachmentId: number) =>
			request<void>(`/api/invoices/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
		url: (id: string, attachmentId: number) => `/api/invoices/${id}/attachments/${attachmentId}`,
	},
	pdfUrl: (id: string) => `/api/invoices/${id}.pdf`,
	xmlUrl: (id: string) => `/api/invoices/${id}.xml`,
	xlsxUrl: (id: string) => `/api/invoices/${id}.xlsx`,
	company: {
		list: () => request<CompanyProfile[]>('/api/company-profiles'),
		getDefault: () => request<CompanyProfile | null>('/api/company-profiles/default'),
		create: (name: string, profile: Party) =>
			request<CompanyProfile>('/api/company-profiles', {
				method: 'POST',
				body: JSON.stringify({ name, profile }),
			}),
		update: (
			id: string,
			patch: {
				/** Name. */
				name?: string;
				/** Data of the party. */
				profile?: Party;
			},
		) => request<CompanyProfile>(`/api/company-profiles/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
	},
	customers: {
		/**
		 * `q` enables the fuzzy search over name, number and city.
		 *
		 * @param q - Search text.
		 */
		list: (q?: string) => request<CompanyProfile[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
		create: (name: string, profile: Party) =>
			request<CompanyProfile>('/api/customers', { method: 'POST', body: JSON.stringify({ name, profile }) }),
		update: (
			id: string,
			patch: {
				/** Name. */
				name?: string;
				/** Data of the party. */
				profile?: Party;
			},
		) => request<CompanyProfile>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
		remove: (id: string) =>
			request<{
				/** True when the call succeeded. */
				ok: boolean;
			}>(`/api/customers/${id}`, { method: 'DELETE' }),
		assignNumbers: () =>
			request<{
				/** Number of entries changed. */
				updated: number;
			}>('/api/customers/number-assign', { method: 'POST' }),
	},
	products: {
		list: () => request<Product[]>('/api/products'),
		create: (item: {
			/** Article number. */
			sku?: string;
			/** Name. */
			name: string;
			/** Additional details. */
			details?: string;
			/** Unit, e.g. Stk or Std. */
			unit?: string;
			/** Net unit price in EUR. */
			unitPriceNet?: number;
			/** VAT rate in percent. */
			vatRate?: number;
		}) => request<Product>('/api/products', { method: 'POST', body: JSON.stringify(item) }),
		update: (
			id: string,
			patch: {
				/** Article number. */
				sku?: string;
				/** Name. */
				name?: string;
				/** Additional details. */
				details?: string;
				/** Unit, e.g. Stk or Std. */
				unit?: string;
				/** Net unit price in EUR. */
				unitPriceNet?: number;
				/** VAT rate in percent. */
				vatRate?: number;
			},
		) => request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
		remove: (id: string) =>
			request<{
				/** True when the call succeeded. */
				ok: boolean;
			}>(`/api/products/${id}`, { method: 'DELETE' }),
	},
	exportUrl: (params: Record<string, string> = {}) => `/api/invoices/export.xlsx?${exportQuery(params)}`,
	/**
	 * Semicolon CSV for the accounting department.
	 *
	 * @param params - Filter parameters.
	 */
	csvUrl: (params: Record<string, string> = {}) => `/api/invoices/export.csv?${exportQuery(params)}`,
	/**
	 * DATEV booking lines.
	 *
	 * @param params - Filter parameters.
	 */
	datevUrl: (params: Record<string, string> = {}) => `/api/invoices/export.datev?${exportQuery(params)}`,
	/**
	 * What a restore would change, without writing anything.
	 *
	 * @param filename - File name.
	 * @param dataBase64 - File content, base64 encoded.
	 */
	restorePreview: (filename?: string, dataBase64?: string) =>
		request<RestorePreview>('/api/restore/preview', {
			method: 'POST',
			body: JSON.stringify({ filename, dataBase64 }),
		}),
};

/**
 * Reads a file as base64 — the part after the `data:` prefix.
 *
 * The adapter takes attachments and logos as base64 JSON (no multipart), so every
 * upload path needs this. `FileReader` is the browser's only way to it, and its
 * `result` is a union type, hence the check instead of a bare `String(...)` cast
 * (which would silently produce `[object ArrayBuffer]`).
 *
 * @param file - File picked in an `<input type="file">`.
 */
export function fileToBase64(file: File): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const text = reader.result;
			if (typeof text !== 'string') {
				reject(new Error(t('Datei nicht lesbar')));
				return;
			}
			resolve(text.split(',')[1]);
		};
		reader.onerror = () => reject(new Error(t('Datei nicht lesbar')));
		reader.readAsDataURL(file);
	});
}

/**
 * Minimal HTML escaping for user data.
 *
 * @param value - Value to process.
 */
export function esc(value: string | number | null | undefined): string {
	return String(value ?? '').replace(
		/[&<>"']/g,
		c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
	);
}

/**
 * EUR formatting mirrored from the backend.
 *
 * @param value - Value to process.
 */
export function eur(value: number): string {
	return `${Number(value).toFixed(2)} EUR`;
}
