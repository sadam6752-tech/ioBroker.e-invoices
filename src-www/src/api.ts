/** Typed client for the adapter /api (same origin, served on :8093). */

export interface Party {
	name: string;
	street: string;
	zip: string;
	city: string;
	country: string;
	vatId?: string;
	taxNumber?: string;
	email?: string;
	phone?: string;
	website?: string;
	customerNumber?: string;
	contactName?: string;
	bankName?: string;
	footerBoxes?: string[];
	footerAlign?: ('left' | 'center' | 'right')[];
	iban?: string;
	bic?: string;
}

export interface InvoiceLine {
	description: string;
	sku?: string;
	details?: string;
	quantity: number;
	unit: string;
	unitPriceNet: number;
	vatRate: number;
	exemptionReason?: string;
	exemptionCategory?: 'E' | 'AE' | 'K' | 'G' | 'O';
	discountPercent?: number;
}

export interface InvoiceTotals {
	netTotal: number;
	taxTotal: number;
	grossTotal: number;
	breakdown: { vatRate: number; net: number; tax: number; gross: number }[];
}

export interface Invoice {
	id: string;
	number: string | null;
	issueDate: string;
	deliveryDate: string;
	dueDate: string | null;
	seller: Party;
	buyer: Party;
	lines: InvoiceLine[];
	totals: InvoiceTotals;
	profile: string;
	status: 'draft' | 'issued' | 'cancelled';
	templateId: string | null;
	employeeCode: string | null;
	documentTitle: string;
	notes: string | null;
	paymentTerms: string | null;
	xml: string | null;
	pdfPath: string | null;
	xlsxPath: string | null;
	paid: boolean;
	paidAt: string | null;
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
	skontoPercent: number;
	skontoDueDate: string | null;
	/** ISO time of the handover to the customer, null while unsent. */
	sentAt: string | null;
	/** Delivery channel, e.g. `E-Mail`. */
	sendChannel: string | null;
	/** § 16 Abs. 2 Nr. 2 UStG check outcome. */
	paymentCheck: string | null;
	paymentCheckedAt: string | null;
	/** Last dunning step. */
	remindedAt: string | null;
	reminderLevel: number;
	/** Earliest legal deletion date (§ 147 AO). */
	retainUntil: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DraftInput {
	seller: Party;
	buyer: Party;
	lines: InvoiceLine[];
	issueDate: string;
	deliveryDate: string;
	dueDate?: string;
	currency?: string;
	employeeCode?: string;
	documentTitle?: string;
	notes?: string;
	paymentTerms?: string;
	skontoPercent?: number;
	skontoDueDate?: string;
	/** R8: `invoice` (default) or `quote` — decides number circle and artifacts. */
	docType?: string;
	/** R8: last day an offer stands (ISO date), only used for offers. */
	validUntil?: string;
}

export interface CompanyProfile {
	id: string;
	name: string;
	profile: Party;
	isDefault: boolean;
}

export interface Product {
	id: string;
	sku: string;
	name: string;
	details: string;
	unit: string;
	unitPriceNet: number;
	vatRate: number;
}

export interface ValidationOutcome {
	formatErrors: string[];
	businessErrors: string[];
	/** Report of this run as stored next to the artifacts, null when the file failed. */
	report: { seq: number; path: string; createdAt: string } | null;
}

/** One stored validation report (R2). */
export interface ValidationReport {
	seq: number;
	reportPath: string;
	formatErrors: number;
	businessErrors: number;
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

export function getToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setToken(token: string | null): void {
	try {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
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
	if (token) headers.authorization = `Bearer ${token}`;
	const res = await fetch(path, { ...init, headers });
	if (res.status === 401) {
		if (!location.hash.startsWith('#/login')) location.hash = '#/login';
		throw new Error('Nicht angemeldet — bitte Token auf der Login-Seite eintragen');
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
		throw new Error(body.error ?? `Download fehlgeschlagen (HTTP ${res.status})`);
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
		throw new Error(body.error ?? `Öffnen fehlgeschlagen (HTTP ${res.status})`);
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
	health: () => request<{ status: string; version: string; schemaVersion: number; counts: Record<string, number> }>('/api/health'),
	settings: () =>
		request<{
			defaultVatRate: number;
			defaultPaymentTerms: string;
			numberFormat: string;
			quoteNumberFormat: string;
			storageMount: string;
			backupIntervalMinutes: number;
		}>('/api/settings'),
	list: (params: Record<string, string> = {}) => {
		const q = new URLSearchParams(params).toString();
		return request<Invoice[]>(`/api/invoices${q ? `?${q}` : ''}`);
	},
	get: (id: string) => request<Invoice>(`/api/invoices/${id}`),
	create: (input: DraftInput) =>
		request<Invoice>('/api/invoices', { method: 'POST', body: JSON.stringify(input) }),
	update: (id: string, patch: Partial<DraftInput>) =>
		request<Invoice>(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
	issue: (id: string) => request<Invoice>(`/api/invoices/${id}/issue`, { method: 'POST' }),
	issueBatch: (ids: string[]) =>
		request<{ issued: Invoice[]; failed: { id: string; error: string }[] }>('/api/invoices/issue-batch', {
			method: 'POST',
			body: JSON.stringify({ ids }),
		}),
	/** Deletes a draft. Issued invoices must be cancelled with a Storno. */
	deleteDraft: (id: string) => request<void>(`/api/invoices/${id}`, { method: 'DELETE' }),
	/** Records the handover of an issued invoice to the customer. */
	markSent: (id: string, channel?: string) =>
		request<Invoice>(`/api/invoices/${id}/sent`, {
			method: 'POST',
			body: JSON.stringify({ channel }),
		}),
	/**
	 * Reports the § 16 Abs. 2 Nr. 2 UStG duty, or stores the outcome when one
	 * is passed.
	 */
	paymentCheck: (id: string, outcome?: string) =>
		request<{ invoice: Invoice; duty: PaymentCheckDuty; checked: boolean }>(
			`/api/invoices/${id}/payment-check`,
			{ method: 'POST', body: JSON.stringify({ outcome }) },
		),
	reminders: () => request<ReminderCandidate[]>('/api/reminders'),
	reminded: (id: string) => request<Invoice>(`/api/invoices/${id}/reminded`, { method: 'POST' }),
	invoiceTemplates: {
		list: () => request<InvoiceTemplate[]>('/api/invoice-templates'),
		create: (name: string, body: unknown) =>
			request<InvoiceTemplate>('/api/invoice-templates', {
				method: 'POST',
				body: JSON.stringify({ name, body }),
			}),
		update: (id: string, patch: { name?: string; body?: unknown }) =>
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
		request<{ reversal: Invoice; original: Invoice }>(`/api/invoices/${id}/storno`, {
			method: 'POST',
			body: JSON.stringify({ reason }),
		}),
	validate: (id: string) => request<ValidationOutcome>(`/api/invoices/${id}/validate`, { method: 'POST' }),
	/** R8: records the customer's "yes" — the first decision counts. */
	quoteAccept: (id: string, at?: string) =>
		request<Invoice>(`/api/invoices/${id}/quote-accept`, {
			method: 'POST',
			body: JSON.stringify({ at }),
		}),
	/** R8: records the customer's "no", with a free-text reason. */
	quoteReject: (id: string, reason?: string) =>
		request<Invoice>(`/api/invoices/${id}/quote-reject`, {
			method: 'POST',
			body: JSON.stringify({ reason }),
		}),
	/**
	 * R8: turns an offer into an invoice *draft* — the number falls on issue.
	 * `requireAccepted: false` covers the deal agreed by phone.
	 */
	convert: (id: string, requireAccepted = true) =>
		request<Invoice>(`/api/invoices/${id}/convert`, {
			method: 'POST',
			body: JSON.stringify({ requireAccepted }),
		}),
	/** Copies the content of an invoice into a new template (no customer, no dates). */
	asTemplate: (id: string, name: string) =>
		request<InvoiceTemplate>(`/api/invoices/${id}/as-template`, {
			method: 'POST',
			body: JSON.stringify({ name }),
		}),
	rerender: (id: string, reason?: string) =>
		request<{ invoice: Invoice; archivedPath: string | null }>(`/api/invoices/${id}/rerender`, {
			method: 'POST',
			body: JSON.stringify({ reason }),
		}),
	renders: (id: string) => request<RenderHistoryEntry[]>(`/api/invoices/${id}/renders`),
	/** Reports of earlier validation runs, newest first (R2). */
	validationReports: (id: string) => request<ValidationReport[]>(`/api/invoices/${id}/validation`),
	/** Download URL of one stored validation report. */
	validationReportUrl: (id: string, seq: number) => `/api/invoices/${id}/validation/${seq}.json`,
	/**
	 * R4: attachments of a draft. Listing never carries the content; the files
	 * are uploaded as base64 JSON (no multipart) and downloaded one by one.
	 */
	attachments: {
		list: (id: string) => request<AttachmentMeta[]>(`/api/invoices/${id}/attachments`),
		add: (id: string, file: { filename: string; mime: string; dataBase64: string }) =>
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
			request<CompanyProfile>('/api/company-profiles', { method: 'POST', body: JSON.stringify({ name, profile }) }),
		update: (id: string, patch: { name?: string; profile?: Party }) =>
			request<CompanyProfile>(`/api/company-profiles/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
	},
	customers: {
		/** `q` enables the fuzzy search over name, number and city. */
		list: (q?: string) => request<CompanyProfile[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
		create: (name: string, profile: Party) =>
			request<CompanyProfile>('/api/customers', { method: 'POST', body: JSON.stringify({ name, profile }) }),
		update: (id: string, patch: { name?: string; profile?: Party }) =>
			request<CompanyProfile>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
		remove: (id: string) => request<{ ok: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),
		assignNumbers: () => request<{ updated: number }>('/api/customers/number-assign', { method: 'POST' }),
	},
	products: {
		list: () => request<Product[]>('/api/products'),
		create: (item: { sku?: string; name: string; details?: string; unit?: string; unitPriceNet?: number; vatRate?: number }) =>
			request<Product>('/api/products', { method: 'POST', body: JSON.stringify(item) }),
		update: (id: string, patch: { sku?: string; name?: string; details?: string; unit?: string; unitPriceNet?: number; vatRate?: number }) =>
			request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
		remove: (id: string) => request<{ ok: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),
	},
	exportUrl: (params: Record<string, string> = {}) => `/api/invoices/export.xlsx?${exportQuery(params)}`,
	/** Semicolon CSV for the accounting department. */
	csvUrl: (params: Record<string, string> = {}) => `/api/invoices/export.csv?${exportQuery(params)}`,
	/** DATEV booking lines. */
	datevUrl: (params: Record<string, string> = {}) => `/api/invoices/export.datev?${exportQuery(params)}`,
	/** What a restore would change, without writing anything. */
	restorePreview: (filename?: string, dataBase64?: string) =>
		request<RestorePreview>('/api/restore/preview', {
			method: 'POST',
			body: JSON.stringify({ filename, dataBase64 }),
		}),
};

/** Minimal HTML escaping for user data. */
export function esc(value: string | number | null | undefined): string {
	return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

/** EUR formatting mirrored from the backend. */
export function eur(value: number): string {
	return `${Number(value).toFixed(2)} EUR`;
}
