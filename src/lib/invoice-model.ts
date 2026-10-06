/**
 * Invoice data model for ioBroker.e-invoices (P1).
 *
 * Pure domain logic without I/O: types, totals calculation and validation
 * against the German Pflichtangaben (§§ 14, 14a UStG, see 2a in
 * eRechnungen-iobroker-PROMPT.md). The XML/PDF mapping happens in P3.
 */

/** Postal party (seller or buyer). */
export interface Party {
	/** Full legal name (Pflicht). */
	name: string;
	/** Street + house number (Pflicht as part of full address). */
	street: string;
	/** Postal code (Pflicht). */
	zip: string;
	/** City (Pflicht). */
	city: string;
	/** ISO country code, default DE (Pflicht). */
	country: string;
	/** VAT-ID (USt-IdNr.) — either this or taxNumber is Pflicht for the seller. */
	vatId?: string;
	/** Local tax number (Steuernummer) — either this or vatId is Pflicht for the seller. */
	taxNumber?: string;
	/** Contact e-mail (optional, needed for delivery). */
	email?: string;
	/** Phone number (optional, header display + BT-42/BT-57). */
	phone?: string;
	/** Website URL (optional, header display only). */
	website?: string;
	/** Customer number, mapped to BT-10 Buyer reference (optional, `-` fallback). */
	customerNumber?: string;
	/**
	 * Leitweg-ID of a public-sector buyer (XRechnung, BT-10). Only used for documents with the
	 * XRechnung profile, where it replaces the customer number as the buyer reference.
	 */
	leitwegId?: string;
	/** Contact person (optional, header/meta display only). */
	contactName?: string;
	/** Bank name (optional, footer display only). */
	bankName?: string;
	/** Footer boxes override (4 entries, lines separated by \n). Empty = auto from company data. */
	footerBoxes?: string[];
	/** Footer box alignment per box (left/center/right). Empty = all left. */
	footerAlign?: ('left' | 'center' | 'right')[];
	/** IBAN of the seller (recommended for payment block). */
	iban?: string;
	/** BIC of the seller (optional). */
	bic?: string;
}

/** Single invoice line item. */
export interface InvoiceLine {
	/** Human-readable description, handelsübliche Bezeichnung (Pflicht). */
	description: string;
	/** Article/SKU number (optional, BT-155, shown as Art.Nr.). */
	sku?: string;
	/** Detail text, second row under the description (optional, BT-154). */
	details?: string;
	/** Quantity (Pflicht, > 0). */
	quantity: number;
	/** Unit, e.g. `Stk`, `Std`, `kg` (recommended). */
	unit: string;
	/** Net unit price in EUR (Pflicht, >= 0). */
	unitPriceNet: number;
	/** VAT rate in percent: 0, 7 or 19. Use 0 + exemptionReason for exempt. */
	vatRate: number;
	/** Reason for tax exemption (Pflicht when vatRate is 0). */
	exemptionReason?: string;
	/**
	 * Tax category for 0 % lines: `E` steuerfrei, `AE` Reverse Charge (§13b,
	 * Ausland), `K` Kfz (§4 Nr. 1b), `G` Gold (§4 Nr. 1a), `O` Nicht
	 * umkehrbar. Only used when vatRate is 0; defaults to `E`.
	 */
	exemptionCategory?: ExemptionCategory;
	/** Pre-agreed line discount in percent, 0-100 (optional). */
	discountPercent?: number;
}

/** Tax category for a 0 % line (EN 16931 VAT category code list). */
export type ExemptionCategory = 'E' | 'AE' | 'K' | 'G' | 'O';

/** All allowed 0 % categories. */
export const EXEMPTION_CATEGORIES: ExemptionCategory[] = ['E', 'AE', 'K', 'G', 'O'];

/** Tax totals for one VAT rate. */
export interface TaxBreakdown {
	/** VAT rate in percent. */
	vatRate: number;
	/** Net amount for this rate, rounded to cents. */
	net: number;
	/** Tax amount for this rate, rounded to cents. */
	tax: number;
	/** Gross amount for this rate, rounded to cents. */
	gross: number;
	/** Exemption reason (only for rate 0). */
	exemptionReason?: string;
}

/** Computed invoice totals (all EUR, rounded to cents). */
export interface InvoiceTotals {
	/** Sum of net line amounts. */
	netTotal: number;
	/** Sum of tax amounts. */
	taxTotal: number;
	/** netTotal + taxTotal. */
	grossTotal: number;
	/** Breakdown per VAT rate. */
	breakdown: TaxBreakdown[];
}

/** Input for a new invoice draft. */
export interface InvoiceDraftInput {
	/** Seller party (prefilled from company profile). */
	seller: Party;
	/** Buyer party. */
	buyer: Party;
	/** Line items (at least one for issue). */
	lines: InvoiceLine[];
	/** Issue date ISO `YYYY-MM-DD` (Pflicht at issue). */
	issueDate: string;
	/** Delivery/service date ISO or period `YYYY-MM-DD..YYYY-MM-DD` (Pflicht at issue). */
	deliveryDate: string;
	/** Payment due date ISO (recommended). */
	dueDate?: string;
	/** Currency, only EUR supported in v1. */
	currency?: string;
	/** Employee code for numbering (e.g. `01`), defaults to `00`. */
	employeeCode?: string;
	/** Document type (R8): invoice (default) or quotation. */
	docType?: DocumentType;
	/** Quotation only: last day the offer stands, ISO `YYYY-MM-DD` (optional). */
	validUntil?: string;
	/**
	 * Quotation this document was created from (R8). Set by the conversion —
	 * never typed by the user — so the chain Angebot → Rechnung stays traceable.
	 */
	sourceDocumentId?: string;
	/** Company profile this document is written for (R6.3); empty = none. */
	companyId?: string | null;
	/** E-invoice profile (R6.1): `EN16931` (ZUGFeRD hybrid, default) or `XRECHNUNG` (XML only, B2G). */
	profile?: InvoiceProfile;
	/** Payment terms text, e.g. Skonto (optional). */
	paymentTerms?: string;
	/** Cash discount in percent, 0-100 (optional, EN 16931 BT-147). */
	skontoPercent?: number;
	/** Last day for the cash discount, ISO (optional, default: due date). */
	skontoDueDate?: string;
	/** Document type label: Rechnung | Gutschrift | Abschlagsrechnung ... */
	documentTitle?: string;
	/** Notes / exemption hints rendered into PDF + XML. */
	notes?: string;
}

/** Invoice lifecycle status. */
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';

/**
 * Document type (R8). The *technical* behaviour hangs off this value: a quote
 * never enters the CII/EN 16931 path, has its own number circle and no
 * retention. `documentTitle` stays a pure display label.
 */
export type DocumentType = 'invoice' | 'quote';

/** All known document types, default first. */
export const DOCUMENT_TYPES: DocumentType[] = ['invoice', 'quote'];

/**
 * Narrows an unknown value to a supported document type (default invoice).
 *
 * @param value - Raw document type as typed by a user or stored in the DB.
 */
export function normalizeDocumentType(value?: string | null): DocumentType {
	const raw = (value ?? '').trim().toLowerCase();
	return raw === 'quote' ? 'quote' : 'invoice';
}

/**
 * True for a quotation — the guard for "never an e-invoice" (R8).
 *
 * @param docType - Document type to inspect.
 */
export function isQuote(docType?: string | null): boolean {
	return normalizeDocumentType(docType) === 'quote';
}

/**
 * Display title used when the user did not type one.
 *
 * @param docType - Document type, defaults to invoice.
 */
export function defaultDocumentTitle(docType?: string | null): string {
	return isQuote(docType) ? 'Angebot' : 'Rechnung';
}

/** Display titles a quotation may carry (offered in the PWA). */
export const QUOTE_TITLES: string[] = ['Angebot', 'Kostenvoranschlag'];

/** Display titles an invoice may carry (offered in the PWA). */
export const INVOICE_TITLES: string[] = ['Rechnung', 'Abschlagsrechnung', 'Schlussrechnung', 'Gutschrift'];

/** Default validity of a quotation in days (R8). */
export const QUOTE_VALIDITY_DAYS = 30;

/** Customer decision on a quotation (R8). */
export type QuoteDecision = 'accepted' | 'rejected';

/**
 * Adds whole days to an ISO date with UTC arithmetic, so the result never
 * drifts over a timezone boundary.
 *
 * @param iso - ISO date `YYYY-MM-DD`.
 * @param days - Days to add, may be negative.
 * @returns The shifted ISO date, or the input when it is not a date.
 */
export function addDaysIso(iso: string, days: number): string {
	if (!isIsoDate(iso)) {
		return iso;
	}
	const base = Date.parse(`${iso}T00:00:00Z`);
	return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Default end of validity of a quotation: 30 days after the issue date (R8,
 * "Gültig bis"). Used when the user leaves the field empty.
 *
 * @param issueDate - ISO issue date of the quotation.
 */
export function defaultValidUntil(issueDate: string): string {
	return addDaysIso(issueDate, QUOTE_VALIDITY_DAYS);
}

/** State of a quotation, derived from its stored dates (R8). */
export type QuoteState = 'draft' | 'open' | 'accepted' | 'rejected' | 'expired';

/** Fields the quotation state is derived from. */
export interface QuoteLifecycle {
	/** Lifecycle status of the record. */
	status: InvoiceStatus;
	/** Last day the offer stands, null for an open-ended offer. */
	validUntil: string | null;
	/** When the customer accepted the offer. */
	acceptedAt: string | null;
	/** When the customer declined the offer. */
	rejectedAt: string | null;
}

/**
 * Derives the state of a quotation. "Verfallen" is computed from `validUntil`
 * and never stored, so the adapter needs no background job for it.
 *
 * @param quote - Lifecycle fields of the quotation.
 * @param today - ISO reference date, default today.
 */
export function quoteState(quote: QuoteLifecycle, today: string = todayIso()): QuoteState {
	if (quote.acceptedAt) {
		return 'accepted';
	}
	// a discarded quotation is off the table for good
	if (quote.rejectedAt || quote.status === 'cancelled') {
		return 'rejected';
	}
	if (quote.status === 'draft') {
		return 'draft';
	}
	if (quote.validUntil && isIsoDate(quote.validUntil) && quote.validUntil < today) {
		return 'expired';
	}
	return 'open';
}

/**
 * German label of a quotation state (PWA badge, PDF note).
 *
 * @param state - Derived state.
 */
export function quoteStateLabel(state: QuoteState): string {
	switch (state) {
		case 'draft':
			return 'Entwurf';
		case 'open':
			return 'Offen';
		case 'accepted':
			return 'Angenommen';
		case 'rejected':
			return 'Abgelehnt';
		default:
			return 'Verfallen';
	}
}

/** Sight-PDF wording that differs between invoices and quotations (R8). */
export interface DocumentLabels {
	/** Meta label of the document number. */
	number: string;
	/** Meta label of the issue date. */
	date: string;
	/** Meta label of the delivery/service date. */
	delivery: string;
	/** Meta label of the payment due date. */
	due: string;
	/** Meta label of the end of validity (quotation). */
	validUntil: string;
	/** Wording of a cash-discount line, e.g. "je Rechnung". */
	perDocument: string;
	/** PDF metadata subject. */
	subject: string;
}

/**
 * Returns the sight-PDF wording for a document type. The XML keeps its neutral
 * EN 16931 wording — this is display only.
 *
 * @param docType - Document type, defaults to invoice.
 */
export function documentLabels(docType?: string | null): DocumentLabels {
	if (isQuote(docType)) {
		return {
			number: 'Angebotsnr.:',
			date: 'Angebotsdatum:',
			delivery: 'Leistungszeitraum:',
			due: 'Zahlungsziel:',
			validUntil: 'Gültig bis:',
			perDocument: 'je Angebot',
			subject: 'Angebot (Sichtkomponente, ohne E-Rechnungs-XML)',
		};
	}
	return {
		number: 'Rechnungsnr.:',
		date: 'Rechnungsdatum:',
		delivery: 'Lieferdatum:',
		due: 'Fällig am:',
		validUntil: 'Gültig bis:',
		perDocument: 'je Rechnung',
		subject: 'E-Rechnung Sichtkomponente (ZUGFeRD)',
	};
}

/** Supported ZUGFeRD profiles (MINIMUM / BASIC-WL are rejected). */
export type ZugferdProfile = 'BASIC' | 'EN16931' | 'EXTENDED' | 'XRECHNUNG';

/** What a new document can be issued as (R6.1): the ZUGFeRD hybrid or the XRechnung XML. */
export type InvoiceProfile = 'EN16931' | 'XRECHNUNG';

/** The profiles a document can be issued as, default first. */
export const INVOICE_PROFILES: InvoiceProfile[] = ['EN16931', 'XRECHNUNG'];

/**
 * Narrows an unknown value to an invoice profile; empty means the default.
 * Anything else is rejected loudly, so a typo never silently issues the wrong format.
 *
 * @param value - Raw profile as typed by a user or sent through the API.
 */
export function normalizeInvoiceProfile(value?: string | null): InvoiceProfile {
	const raw = (value ?? '').trim().toUpperCase();
	if (raw === '') {
		return 'EN16931';
	}
	if (raw === 'EN16931' || raw === 'XRECHNUNG') {
		return raw;
	}
	throw new Error(`Unknown profile "${value}" — use EN16931 (ZUGFeRD) or XRECHNUNG.`);
}

/**
 * The draft profile of a stored document: XRechnung stays XRechnung, everything else is the
 * ZUGFeRD default. Tolerant on purpose — it reads what is in the database and never throws.
 *
 * @param profile - Stored profile string.
 */
export function storedInvoiceProfile(profile?: string | null): InvoiceProfile {
	return isXRechnung(profile) ? 'XRECHNUNG' : 'EN16931';
}

/**
 * True for the XRechnung profile (XML only, no PDF/A-3 container).
 *
 * @param profile - Stored profile string.
 */
export function isXRechnung(profile?: string | null): boolean {
	return (profile ?? '').trim().toUpperCase() === 'XRECHNUNG';
}

/** Leitweg-ID syntax: letters, digits and hyphens, at most 46 characters (checksum is not checked). */
export const LEITWEG_ID_PATTERN = /^[0-9A-Za-z][0-9A-Za-z-]{0,45}$/;

/** Allowed VAT rates in v1. */
export const ALLOWED_VAT_RATES: readonly number[] = [0, 7, 19];

/**
 * Round EUR amounts to cents (half away from zero via Math.round).
 *
 * @param value - Amount in EUR.
 */
export function roundCents(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Default invoice number pattern: year, employee code, sequence. */
export const DEFAULT_NUMBER_FORMAT = '{YYYY}-{EMPLOYEE}-{SEQ}';

/**
 * Default quotation number pattern. A different circle with a visible prefix:
 * `A-2026-01-001`. It never touches the invoice sequence.
 */
export const DEFAULT_QUOTE_NUMBER_FORMAT = 'A-{YYYY}-{EMPLOYEE}-{SEQ}';

/** Tokens accepted in a custom number format. */
const NUMBER_FORMAT_TOKENS = ['YYYY', 'EMPLOYEE', 'SEQ'] as const;

/**
 * Validates a custom invoice number format. Only the documented tokens are
 * allowed, `{SEQ}` must appear exactly once (§ 14 UStG needs an unbroken
 * sequence), and the result must stay filename-safe.
 *
 * @param format - Raw format string from the instance config.
 * @returns The trimmed format, or null when unusable.
 */
export function normalizeNumberFormat(format?: string): string | null {
	const raw = (format ?? '').trim();
	if (raw === '' || raw.length > 40) {
		return null;
	}
	// exactly one sequence token, otherwise the number series is not continuous
	if (raw.split('{SEQ}').length - 1 !== 1) {
		return null;
	}
	// remove the known tokens; everything left must be a filename-safe separator
	let rest = raw;
	for (const token of NUMBER_FORMAT_TOKENS) {
		rest = rest.split(`{${token}}`).join('');
	}
	if (rest.length > 0 && !/^[A-Za-z0-9.\-_]+$/.test(rest)) {
		return null;
	}
	return raw;
}

/**
 * Renders an invoice number from a custom format.
 *
 * @param format - Validated format string.
 * @param parts - Values for the tokens.
 * @param parts.year - Calendar year.
 * @param parts.employee - Employee code.
 * @param parts.seq - Running sequence.
 * @returns The rendered number.
 */
export function renderInvoiceNumber(format: string, parts: { year: number; employee: string; seq: number }): string {
	const width = Math.max(3, String(parts.seq).length);
	return format
		.replace('{YYYY}', String(parts.year))
		.replace('{EMPLOYEE}', normalizeEmployeeCode(parts.employee))
		.replace('{SEQ}', String(parts.seq).padStart(width, '0'));
}

/**
 * Formats an invoice number as `YYYY-EE-NNN` (employee code + sequence).
 *
 * @param year - Calendar year, e.g. 2026.
 * @param employee - Employee code (normalized, e.g. `01`).
 * @param seq - Running sequence within year+employee, starting at 1.
 * @param width - Zero-padding width, default 3.
 */
export function formatInvoiceNumber(year: number, employee: string, seq: number, width = 3): string {
	if (!Number.isInteger(year) || year < 2000 || year > 2100) {
		throw new Error(`Invalid year for invoice number: ${year}`);
	}
	const code = normalizeEmployeeCode(employee);
	if (!Number.isInteger(seq) || seq < 1) {
		throw new Error(`Invalid sequence for invoice number: ${seq}`);
	}
	return `${year}-${code}-${String(seq).padStart(width, '0')}`;
}

/**
 * Normalizes an employee code (uppercase, fixed width `00`).
 * Numeric codes are zero-padded to two digits so `1` and `01` cannot
 * create two parallel counters for the same person (GoBD: one
 * uninterrupted number series per employee).
 *
 * @param code - Raw code from the draft or UI.
 */
export function normalizeEmployeeCode(code?: string): string {
	const normalized = (code ?? '').trim().toUpperCase() || '00';
	if (!/^[A-Z0-9]{1,8}$/.test(normalized)) {
		throw new Error(`Invalid employee code (1-8 letters/digits): ${code}`);
	}
	return /^\d+$/.test(normalized) ? normalized.padStart(2, '0') : normalized;
}

/**
 * Net amount of a single line (BT-146). Rounds exactly once, from
 * quantity × price × discount — never by first rounding the unit price and
 * then multiplying, which drifts by cents and breaks BR-CO-10.
 *
 * @param line - Invoice line item.
 */
export function lineNetAmount(line: InvoiceLine): number {
	const discount = line.discountPercent ?? 0;
	return roundCents(line.quantity * line.unitPriceNet * (1 - discount / 100));
}

/**
 * Discounted net unit price for a line. Deliberately NOT rounded to cents:
 * `quantity × netUnit` has to reproduce `lineNetAmount` exactly, which is
 * impossible with a 2-decimal unit price for fractional quantities
 * (3 × 0,335 € = 1,01 €; a 0,34 € unit price would yield 1,02 €).
 *
 * @param line - Invoice line item.
 */
export function lineNetUnitPrice(line: InvoiceLine): number {
	if (!(line.quantity > 0)) {
		return 0;
	}
	return lineNetAmount(line) / line.quantity;
}

/**
 * Calculates net/tax/gross totals grouped by VAT rate.
 * Tax per rate is rounded from the rate basis (BR-CO-17), never summed
 * from rounded line taxes (that drifts by cents on fractional amounts).
 *
 * @param lines - Invoice line items.
 */
export function calcTotals(lines: InvoiceLine[]): InvoiceTotals {
	const netByRate = new Map<number, number>();
	for (const line of lines) {
		if (!ALLOWED_VAT_RATES.includes(line.vatRate)) {
			throw new Error(`Unsupported VAT rate: ${line.vatRate}`);
		}
		if (!(line.quantity > 0)) {
			throw new Error(`Quantity must be > 0: ${line.description}`);
		}
		if (!(line.unitPriceNet >= 0)) {
			throw new Error(`Unit price must be >= 0: ${line.description}`);
		}
		const discount = line.discountPercent ?? 0;
		if (!(discount >= 0) || discount > 100) {
			throw new Error(`Discount must be 0-100: ${line.description}`);
		}
		const net = lineNetAmount(line);
		netByRate.set(line.vatRate, roundCents((netByRate.get(line.vatRate) ?? 0) + net));
	}
	const breakdown: TaxBreakdown[] = [...netByRate.entries()]
		.sort(([a], [b]) => a - b)
		.map(([vatRate, net]) => {
			const tax = roundCents((net * vatRate) / 100);
			return { vatRate, net, tax, gross: roundCents(net + tax) };
		});
	const netTotal = roundCents(breakdown.reduce((sum, item) => sum + item.net, 0));
	const taxTotal = roundCents(breakdown.reduce((sum, item) => sum + item.tax, 0));
	return { netTotal, taxTotal, grossTotal: roundCents(netTotal + taxTotal), breakdown };
}

/**
 * ISO date `YYYY-MM-DD` check (format only, no calendar validation beyond regex).
 *
 * @param value - Candidate date string.
 */
export function isIsoDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}
	// real calendar check: 2026-02-31 must not pass
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * A service/delivery date, either a single day or a period.
 */
export interface DeliveryPeriod {
	/** First day, ISO YYYY-MM-DD (BT-72). */
	start: string;
	/** Last day, ISO YYYY-MM-DD (BT-74), null for a single day. */
	end: string | null;
}

/**
 * Parses the delivery date field, which may hold a single ISO day
 * (`2026-10-01`) or a period (`2026-10-01..2026-10-31`).
 * Returns null when the value is not a valid calendar date / period.
 *
 * @param value - Raw delivery date from the draft.
 */
export function parseDeliveryPeriod(value: string): DeliveryPeriod | null {
	const raw = (value ?? '').trim();
	if (raw.includes('..')) {
		const [start, end] = raw.split('..').map(part => part.trim());
		if (!isIsoDate(start ?? '') || !isIsoDate(end ?? '') || (end ?? '') < (start ?? '')) {
			return null;
		}
		return { start: start, end: end };
	}
	return isIsoDate(raw) ? { start: raw, end: null } : null;
}

/**
 * Human readable delivery date, e.g. `01.10.2026` or `01.10.2026 – 31.10.2026`.
 *
 * @param value - Raw delivery date from the draft.
 */
export function formatDeliveryDateDe(value: string): string {
	const period = parseDeliveryPeriod(value);
	if (!period) {
		return value;
	}
	const de = (iso: string): string => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
	return period.end ? `${de(period.start)} – ${de(period.end)}` : de(period.start);
}

/**
 * Cash discount (Skonto) arithmetic. The discount is taken from the gross
 * total and reduces the amount due when paid within the discount period.
 *
 * @param grossTotal - Gross total of the invoice.
 * @param skontoPercent - Discount in percent.
 * @param skontoDueDate - Last day for the discount (ISO or empty).
 * @param dueDate - Regular due date (ISO or empty).
 */
export function calcSkonto(
	grossTotal: number,
	skontoPercent?: number,
	skontoDueDate?: string,
	dueDate?: string,
): { percent: number; amount: number; payableNow: number; dueDate: string | null } {
	const percent = Number(skontoPercent) || 0;
	if (!(percent > 0)) {
		return { percent: 0, amount: 0, payableNow: grossTotal, dueDate: skontoDueDate?.trim() || dueDate || null };
	}
	const amount = roundCents((grossTotal * percent) / 100);
	return {
		percent,
		amount,
		payableNow: roundCents(grossTotal - amount),
		dueDate: skontoDueDate?.trim() || dueDate || null,
	};
}

/**
 * Formats an automatically assigned customer number (BT-10).
 * BT-10 is a seller-assigned key with no prescribed format; only the public
 * sector Leitweg-ID has a mandatory layout — an XRechnung carries it instead (`Party.leitwegId`).
 *
 * @param seq - Sequence number.
 */
export function formatCustomerNumber(seq: number): string {
	if (!Number.isInteger(seq) || seq < 1) {
		throw new Error(`Invalid customer number sequence: ${seq}`);
	}
	return `K-${String(seq).padStart(5, '0')}`;
}

/**
 * Current date as ISO `YYYY-MM-DD` (UTC).
 *
 * @param date - Reference point, defaults to now.
 */
export function todayIso(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

/**
 * Whole days between two ISO dates; negative when `to` lies in the past.
 *
 * @param from - ISO start date.
 * @param to - ISO end date.
 * @returns Difference in days, 0 when a date is unparsable.
 */
export function daysBetween(from: string, to: string): number {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	if (Number.isNaN(a) || Number.isNaN(b)) {
		return 0;
	}
	return Math.floor((b - a) / 86_400_000);
}

/** Result of the § 16 Abs. 2 Nr. 2 UStG payment-method check. */
export interface PaymentCheckDuty {
	/** True when the check is legally required. */
	required: boolean;
	/** Human-readable reason, empty when not required. */
	reason: string;
	/** Whole days the invoice is overdue (0 when not yet due). */
	overdueDays: number;
}

/**
 * § 16 Abs. 2 Nr. 2 UStG: once an invoice is unpaid and either more than 10.000
 * EUR gross or more than 40 days overdue, the *payment method* has to be
 * checked before the next delivery. The law prescribes no method, so the
 * adapter only reports the duty and leaves the decision to the user.
 *
 * @param dueDate - ISO due date, null when payable on receipt.
 * @param grossTotal - Gross total in EUR.
 * @param today - ISO reference date, default today.
 * @returns Whether the check is due, with the reason and the overdue days.
 */
export function paymentCheckDuty(
	dueDate: string | null,
	grossTotal: number,
	today: string = todayIso(),
): PaymentCheckDuty {
	const overdueDays = dueDate ? Math.max(0, daysBetween(dueDate, today)) : 0;
	// Both alternatives of the paragraph trigger the duty on their own.
	if (Number(grossTotal) > 10_000) {
		return {
			required: true,
			reason: `Betrag über 10.000 EUR (${Number(grossTotal).toFixed(2)} EUR) – Zahlungsweise nach § 16 Abs. 2 Nr. 2 UStG prüfen.`,
			overdueDays,
		};
	}
	if (overdueDays > 40) {
		return {
			required: true,
			reason: `Mehr als 40 Tage überfällig (${overdueDays} Tage) – Zahlungsweise nach § 16 Abs. 2 Nr. 2 UStG prüfen.`,
			overdueDays,
		};
	}
	return { required: false, reason: '', overdueDays };
}

/**
 * Creates an empty invoice draft skeleton (used by the control command
 * and later the PWA "new invoice" flow). Drafts may be incomplete —
 * validation happens only at issue.
 *
 * @param date - Prefill date for issue/delivery, defaults to today.
 * @param docType - Document type of the new draft, defaults to an invoice.
 */
export function blankDraft(date = todayIso(), docType: DocumentType = 'invoice'): InvoiceDraftInput {
	const emptyParty: Party = { name: '', street: '', zip: '', city: '', country: 'DE' };
	const kind = normalizeDocumentType(docType);
	return {
		seller: { ...emptyParty },
		buyer: { ...emptyParty },
		lines: [],
		issueDate: date,
		deliveryDate: date,
		currency: 'EUR',
		// a new document starts as an invoice unless the caller asks for a
		// quotation; the PWA switches the type in the wizard, too (R8)
		docType: kind,
		documentTitle: defaultDocumentTitle(kind),
		// a quotation carries a validity date from the start (R8)
		validUntil: isQuote(kind) ? defaultValidUntil(date) : undefined,
	};
}

function isBlank(value: string | undefined): boolean {
	return value === undefined || value.trim().length === 0;
}

/**
 * The extra Pflichtangaben of an XRechnung (R6.1, XRechnung 3.0 / CIUS rules BR-DE-*). Only the syntax of the
 * Leitweg-ID is checked — its checksum is defined for some federal states only, a stricter test would reject
 * valid IDs.
 *
 * @param input - Invoice draft with the XRechnung profile.
 */
function xrechnungErrors(input: InvoiceDraftInput): string[] {
	const errors: string[] = [];
	const { seller, buyer } = input;
	const leitweg = buyer.leitwegId?.trim() ?? '';
	if (leitweg === '') {
		errors.push('XRechnung: the buyer needs a Leitweg-ID (BT-10, BR-DE-15).');
	} else if (!LEITWEG_ID_PATTERN.test(leitweg)) {
		errors.push(
			'XRechnung: the Leitweg-ID may only contain letters, digits and hyphens (at most 46 characters, BT-10).',
		);
	}
	if (isBlank(buyer.email)) {
		errors.push('XRechnung: the buyer needs an e-mail address (BT-49, PEPPOL-EN16931-R010).');
	}
	if (isBlank(seller.contactName)) {
		errors.push('XRechnung: the seller needs a contact person (BT-41, BR-DE-5) — set it in the company data.');
	}
	if (isBlank(seller.phone)) {
		errors.push('XRechnung: the seller needs a phone number (BT-42, BR-DE-6) — set it in the company data.');
	}
	if (isBlank(seller.email)) {
		errors.push('XRechnung: the seller needs an e-mail address (BT-43, BR-DE-7) — set it in the company data.');
	}
	if (isBlank(seller.iban)) {
		errors.push('XRechnung: the seller needs an IBAN for the payment instructions (BT-84, BR-DE-23).');
	}
	return errors;
}

/**
 * Validates a draft against the German Pflichtangaben for issue.
 * The required set depends on the document type (R8): a quotation needs no
 * BT-10 and no Skonto, an invoice does. Returns a list of human-readable
 * errors; empty means issuable.
 * Drafts may be incomplete — call this only on the issue path.
 *
 * @param input - Invoice draft to validate.
 */
export function validateInvoiceForIssue(input: InvoiceDraftInput): string[] {
	const errors: string[] = [];
	const { seller, buyer, lines } = input;
	// R8: a quotation has its own, smaller Pflicht-set. It is a plain PDF and
	// never enters the CII/EN 16931 path, so BT-10 and Skonto do not apply.
	const quote = isQuote(input.docType);

	if (isBlank(seller.name) || isBlank(seller.street) || isBlank(seller.zip) || isBlank(seller.city)) {
		errors.push('Seller needs full name and address (name, street, zip, city).');
	}
	if (isBlank(seller.vatId) && isBlank(seller.taxNumber)) {
		errors.push('Seller needs Steuernummer or USt-IdNr.');
	}
	if (isBlank(buyer.name) || isBlank(buyer.street) || isBlank(buyer.zip) || isBlank(buyer.city)) {
		errors.push('Buyer needs full name and address (name, street, zip, city).');
	}
	// BT-10 (Käuferreferenz) is mandatory in the German EN 16931 profile; without
	// it the receiver's validation tooling rejects the invoice
	const xrechnung = !quote && isXRechnung(input.profile);
	if (!quote && !xrechnung && isBlank(buyer.customerNumber)) {
		errors.push('Buyer needs a customer number (Kundennummer, BT-10) for the German e-invoice.');
	}
	if (xrechnung) {
		errors.push(...xrechnungErrors(input));
	}
	if (isBlank(input.issueDate) || !isIsoDate(input.issueDate)) {
		errors.push('Issue date must be a real calendar date in ISO format (YYYY-MM-DD).');
	}
	// a period is allowed and carried into the XML as BT-72 + BT-74
	if (isBlank(input.deliveryDate)) {
		errors.push('Delivery/service date is required.');
	} else if (!parseDeliveryPeriod(input.deliveryDate)) {
		errors.push(
			'Delivery/service date must be a real calendar date (YYYY-MM-DD) or a period (YYYY-MM-DD..YYYY-MM-DD).',
		);
	}
	if (isQuote(input.docType) && !isBlank(input.validUntil)) {
		if (!isIsoDate(input.validUntil as string)) {
			errors.push('Valid-until date must be a real calendar date (YYYY-MM-DD).');
		} else if (isIsoDate(input.issueDate) && (input.validUntil as string) < input.issueDate) {
			errors.push('Valid-until date must not be before the issue date.');
		}
	}
	if (!quote && input.skontoPercent !== undefined) {
		const skonto = Number(input.skontoPercent);
		if (!(skonto >= 0) || skonto > 100) {
			errors.push('Skonto must be between 0 and 100 percent.');
		} else if (skonto > 0) {
			// the discount deadline may fall back to the regular due date
			const deadline = input.skontoDueDate?.trim() || input.dueDate;
			if (!deadline || !isIsoDate(deadline)) {
				errors.push('Skonto needs a discount deadline (Skonto bis, ISO YYYY-MM-DD).');
			} else if (isIsoDate(input.issueDate) && deadline < input.issueDate) {
				errors.push('Skonto deadline must not be before the issue date.');
			} else if (input.dueDate && isIsoDate(input.dueDate) && deadline > input.dueDate) {
				errors.push('Skonto deadline must not be later than the due date.');
			}
		}
	}
	if (lines.length === 0) {
		errors.push('At least one line item is required.');
	}
	lines.forEach((line, index) => {
		const pos = index + 1;
		if (isBlank(line.description)) {
			errors.push(`Line ${pos}: description is required.`);
		}
		if (!(line.quantity > 0)) {
			errors.push(`Line ${pos}: quantity must be > 0.`);
		}
		if (!(line.unitPriceNet >= 0)) {
			errors.push(`Line ${pos}: unit price must be >= 0.`);
		}
		if (!ALLOWED_VAT_RATES.includes(line.vatRate)) {
			errors.push(`Line ${pos}: VAT rate must be one of ${ALLOWED_VAT_RATES.join(', ')}.`);
		}
		if (line.vatRate === 0 && isBlank(line.exemptionReason)) {
			errors.push(`Line ${pos}: exemption reason required for 0% VAT (or use a taxable rate).`);
		}
		if (line.vatRate === 0 && line.exemptionCategory && !EXEMPTION_CATEGORIES.includes(line.exemptionCategory)) {
			errors.push(`Line ${pos}: exemption category must be one of ${EXEMPTION_CATEGORIES.join(', ')}.`);
		}
	});
	if (input.currency !== undefined && input.currency !== 'EUR') {
		errors.push('Only EUR is supported in v1.');
	}
	if (input.employeeCode !== undefined) {
		try {
			normalizeEmployeeCode(input.employeeCode);
		} catch (error) {
			errors.push((error as Error).message);
		}
	}
	try {
		calcTotals(lines);
	} catch (error) {
		errors.push(`Totals error: ${(error as Error).message}`);
	}
	return errors;
}

/** An inclusive range of issue dates; a missing side is open. */
export interface DateRange {
	/** First day, ISO `YYYY-MM-DD`. */
	from?: string;
	/** Last day, ISO `YYYY-MM-DD`. */
	to?: string;
}

/**
 * Reads and checks the `from` / `to` filter of a request. Both days belong to the range, so
 * 1 August to 31 August contains the invoices of both days.
 *
 * @param from - First day, empty or missing = open.
 * @param to - Last day, empty or missing = open.
 * @returns The range, or an error text for a malformed day or a range that ends before it starts.
 */
export function parseDateRange(from: unknown, to: unknown): DateRange | string {
	const range: DateRange = {};
	for (const [key, value] of [
		['from', from],
		['to', to],
	] as const) {
		if (value === undefined || value === '') {
			continue;
		}
		if (typeof value !== 'string' || !isIsoDate(value)) {
			return `${key} must be a date like 2026-08-31`;
		}
		range[key] = value;
	}
	if (range.from && range.to && range.from > range.to) {
		return 'from must not be after to';
	}
	return range;
}

/**
 * Words for a range in German date format, e.g. `01.08.2026–31.08.2026` (shown in the title of
 * an export).
 *
 * @param range - The range.
 */
export function formatDateRange(range: DateRange): string {
	const de = (iso: string): string => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
	if (range.from && range.to) {
		return `${de(range.from)}–${de(range.to)}`;
	}
	if (range.from) {
		return `ab ${de(range.from)}`;
	}
	return range.to ? `bis ${de(range.to)}` : '';
}

/**
 * Part of an export file name that names the range: `_2026-08-01_2026-08-31`, `_ab-…`, `_bis-…`.
 *
 * @param range - The range.
 */
export function dateRangeFileSuffix(range: DateRange): string {
	if (range.from && range.to) {
		return `_${range.from}_${range.to}`;
	}
	if (range.from) {
		return `_ab-${range.from}`;
	}
	return range.to ? `_bis-${range.to}` : '';
}
