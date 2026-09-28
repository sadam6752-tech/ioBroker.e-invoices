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
	/** Customer number, mapped to BT-10 Buyer reference (optional, `-` fallback). */
	customerNumber?: string;
	/** IBAN of the seller (recommended for payment block). */
	iban?: string;
	/** BIC of the seller (optional). */
	bic?: string;
}

/** Single invoice line item. */
export interface InvoiceLine {
	/** Human-readable description, handelsübliche Bezeichnung (Pflicht). */
	description: string;
	/** Quantity (Pflicht, > 0). */
	quantity: number;
	/** Unit, e.g. `Stk`, `Std`, `kg` (recommended). */
	unit: string;
	/** Net unit price in EUR (Pflicht, >= 0). */
	unitPriceNet: number;
	/** VAT rate in percent: 0, 7 or 19. Use 0 + exemptionReason for exempt. */
	vatRate: number;
	/** Reason for tax exemption (Pflicht when vatRate is 0 and exempt). */
	exemptionReason?: string;
	/** Pre-agreed line discount in percent, 0-100 (optional). */
	discountPercent?: number;
}

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
	/** Payment terms text, e.g. Skonto (optional). */
	paymentTerms?: string;
	/** Document type label: Rechnung | Gutschrift | Abschlagsrechnung ... */
	documentTitle?: string;
	/** Notes / exemption hints rendered into PDF + XML. */
	notes?: string;
}

/** Invoice lifecycle status. */
export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';

/** Supported ZUGFeRD profiles (MINIMUM / BASIC-WL are rejected). */
export type ZugferdProfile = 'BASIC' | 'EN16931' | 'EXTENDED' | 'XRECHNUNG';

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

/**
 * Formats an invoice number as `YYYY-NNNN` (zero-padded sequence).
 *
 * @param year - Calendar year, e.g. 2026.
 * @param seq - Running sequence within the year, starting at 1.
 * @param width - Zero-padding width, default 4.
 */
export function formatInvoiceNumber(year: number, seq: number, width = 4): string {
	if (!Number.isInteger(year) || year < 2000 || year > 2100) {
		throw new Error(`Invalid year for invoice number: ${year}`);
	}
	if (!Number.isInteger(seq) || seq < 1) {
		throw new Error(`Invalid sequence for invoice number: ${seq}`);
	}
	return `${year}-${String(seq).padStart(width, '0')}`;
}

/**
 * Calculates net/tax/gross totals grouped by VAT rate.
 *
 * @param lines - Invoice line items.
 */
export function calcTotals(lines: InvoiceLine[]): InvoiceTotals {
	const byRate = new Map<number, { net: number; tax: number }>();
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
		if (discount < 0 || discount > 100) {
			throw new Error(`Discount must be 0-100: ${line.description}`);
		}
		const net = roundCents(line.quantity * line.unitPriceNet * (1 - discount / 100));
		const tax = roundCents((net * line.vatRate) / 100);
		const entry = byRate.get(line.vatRate) ?? { net: 0, tax: 0 };
		entry.net = roundCents(entry.net + net);
		entry.tax = roundCents(entry.tax + tax);
		byRate.set(line.vatRate, entry);
	}
	const breakdown: TaxBreakdown[] = [...byRate.entries()]
		.sort(([a], [b]) => a - b)
		.map(([vatRate, sums]) => ({
			vatRate,
			net: sums.net,
			tax: sums.tax,
			gross: roundCents(sums.net + sums.tax),
		}));
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
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
 * Creates an empty invoice draft skeleton (used by the control command
 * and later the PWA "new invoice" flow). Drafts may be incomplete —
 * validation happens only at issue.
 *
 * @param date - Prefill date for issue/delivery, defaults to today.
 */
export function blankDraft(date = todayIso()): InvoiceDraftInput {
	const emptyParty: Party = { name: '', street: '', zip: '', city: '', country: 'DE' };
	return {
		seller: { ...emptyParty },
		buyer: { ...emptyParty },
		lines: [],
		issueDate: date,
		deliveryDate: date,
		currency: 'EUR',
		documentTitle: 'Rechnung',
	};
}

function isBlank(value: string | undefined): boolean {
	return value === undefined || value.trim().length === 0;
}

/**
 * Validates a draft against the German Pflichtangaben for issue.
 * Returns a list of human-readable errors; empty means issuable.
 * Drafts may be incomplete — call this only on the issue path.
 *
 * @param input - Invoice draft to validate.
 */
export function validateInvoiceForIssue(input: InvoiceDraftInput): string[] {
	const errors: string[] = [];
	const { seller, buyer, lines } = input;

	if (isBlank(seller.name) || isBlank(seller.street) || isBlank(seller.zip) || isBlank(seller.city)) {
		errors.push('Seller needs full name and address (name, street, zip, city).');
	}
	if (isBlank(seller.vatId) && isBlank(seller.taxNumber)) {
		errors.push('Seller needs Steuernummer or USt-IdNr.');
	}
	if (isBlank(buyer.name) || isBlank(buyer.street) || isBlank(buyer.zip) || isBlank(buyer.city)) {
		errors.push('Buyer needs full name and address (name, street, zip, city).');
	}
	if (isBlank(input.issueDate) || !isIsoDate(input.issueDate)) {
		errors.push('Issue date must be ISO YYYY-MM-DD.');
	}
	if (isBlank(input.deliveryDate)) {
		errors.push('Delivery/service date is required.');
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
	});
	if (input.currency !== undefined && input.currency !== 'EUR') {
		errors.push('Only EUR is supported in v1.');
	}
	try {
		calcTotals(lines);
	} catch (error) {
		errors.push(`Totals error: ${(error as Error).message}`);
	}
	return errors;
}
