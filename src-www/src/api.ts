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

export const api = {
	health: () => request<{ status: string; version: string; schemaVersion: number; counts: Record<string, number> }>('/api/health'),
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
	validate: (id: string) => request<ValidationOutcome>(`/api/invoices/${id}/validate`, { method: 'POST' }),
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
		list: () => request<CompanyProfile[]>('/api/customers'),
		create: (name: string, profile: Party) =>
			request<CompanyProfile>('/api/customers', { method: 'POST', body: JSON.stringify({ name, profile }) }),
		update: (id: string, patch: { name?: string; profile?: Party }) =>
			request<CompanyProfile>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
		remove: (id: string) => request<{ ok: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),
	},
	products: {
		list: () => request<Product[]>('/api/products'),
		create: (item: { sku?: string; name: string; details?: string; unit?: string; unitPriceNet?: number; vatRate?: number }) =>
			request<Product>('/api/products', { method: 'POST', body: JSON.stringify(item) }),
		update: (id: string, patch: { sku?: string; name?: string; details?: string; unit?: string; unitPriceNet?: number; vatRate?: number }) =>
			request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
		remove: (id: string) => request<{ ok: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),
	},
	exportUrl: (params: Record<string, string> = {}) => {
		const q = new URLSearchParams(params).toString();
		return `/api/invoices/export.xlsx${q ? `?${q}` : ''}`;
	},
};

/** Minimal HTML escaping for user data. */
export function esc(value: string | number | null | undefined): string {
	return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

/** EUR formatting mirrored from the backend. */
export function eur(value: number): string {
	return `${Number(value).toFixed(2)} EUR`;
}
