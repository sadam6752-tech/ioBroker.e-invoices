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
 * sector Leitweg-ID has a mandatory layout, which this adapter does not use.
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
	// BT-10 (Käuferreferenz) is mandatory in the German EN 16931 profile; without
	// it the receiver's validation tooling rejects the invoice
	if (isBlank(buyer.customerNumber)) {
		errors.push('Buyer needs a customer number (Kundennummer, BT-10) for the German e-invoice.');
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
	if (input.skontoPercent !== undefined) {
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
