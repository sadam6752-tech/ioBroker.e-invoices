/**
 * The words of a document type (R8).
 *
 * Mirrors `documentLabels()` and the quotation life cycle of
 * `src/lib/invoice-model.ts`. The document type is data in the adapter, so the
 * interface must not hard-wire "Rechnung" into an offer screen. Everything
 * below is display only; number circle, validation and the artifacts stay the
 * server's decision.
 */
import { t } from './i18n';

/** Document types the adapter stores. */
export type DocType = 'invoice' | 'quote';

/** Display wording of one document type (the sight PDF uses the same words). */
export interface DocLabels {
	/** Noun, singular: "Rechnung" / "Angebot". */
	one: string;
	/** Noun, plural, used as the headline of a list. */
	plural: string;
	/** Meta label of the document number. */
	number: string;
	/** Meta label of the issue date. */
	date: string;
	/** Meta label of the service period. */
	delivery: string;
	/** Meta label of the payment due date. */
	due: string;
	/** Meta label of the end of validity. */
	validUntil: string;
	/** Wording of a cash-discount line, e.g. "je Rechnung". */
	perDocument: string;
	/** Title the wizard starts with. */
	defaultTitle: string;
	/** Display titles the wizard offers. */
	titles: string[];
	/** Label of the button that starts a new document of this type. */
	newOne: string;
	/** Label of the button that fixes the number and writes the PDF. */
	issue: string;
	/** Question of the confirmation dialog before issuing. */
	issueConfirm: string;
	/** One sentence about what the document type is and is not. */
	hint: string;
	/** True for an offer: no e-invoice, no payment, no dunning. */
	offer: boolean;
}

/** Display titles an invoice may carry (mirrors INVOICE_TITLES). */
export const INVOICE_TITLES: string[] = ['Rechnung', 'Abschlagsrechnung', 'Schlussrechnung', 'Gutschrift'];

/** Display titles an offer may carry (mirrors QUOTE_TITLES). */
export const QUOTE_TITLES: string[] = ['Angebot', 'Kostenvoranschlag'];

/** Default validity of an offer in days (mirrors QUOTE_VALIDITY_DAYS). */
export const QUOTE_VALIDITY_DAYS = 30;

/**
 * Wording of an invoice: a booked e-invoice.
 *
 * Built per call because the language of the page is chosen at start-up (R7.2);
 * the German sentences are the keys of `t()` and stay the wording of the PDF.
 */
function invoiceLabels(): DocLabels {
	return {
		one: t('Rechnung'),
		plural: t('Rechnungen'),
		number: t('Rechnungsnr.:'),
		date: t('Rechnungsdatum:'),
		delivery: t('Lieferdatum:'),
		due: t('Fällig am:'),
		validUntil: t('Gültig bis:'),
		perDocument: t('je Rechnung'),
		defaultTitle: 'Rechnung',
		titles: INVOICE_TITLES,
		newOne: t('+ Neue Rechnung'),
		issue: t('Ausstellen'),
		issueConfirm: t('Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).'),
		hint: t(
			'Eine ausgestellte Rechnung ist eine E-Rechnung: PDF/A-3 mit XML, eigenes Mahnwesen und Buchhaltungsexport.',
		),
		offer: false,
	};
}

/** Wording of an offer: a plain sight PDF, never an e-invoice. */
function quoteLabels(): DocLabels {
	return {
		one: t('Angebot'),
		plural: t('Angebote'),
		number: t('Angebotsnr.:'),
		date: t('Angebotsdatum:'),
		delivery: t('Leistungszeitraum:'),
		due: t('Zahlungsziel:'),
		validUntil: t('Gültig bis:'),
		perDocument: t('je Angebot'),
		defaultTitle: 'Angebot',
		titles: QUOTE_TITLES,
		newOne: t('+ Neues Angebot'),
		issue: t('Ausstellen'),
		issueConfirm: t(
			'Wirklich ausstellen? Das Angebot bekommt seine Nummer aus dem Angebotsnummernkreis und die PDF wird geschrieben. Danach ist keine Änderung mehr möglich.',
		),
		hint: t(
			'Ein Angebot ist keine E-Rechnung: gespeichert wird ein Sicht-PDF ohne XML, gemahnt wird nie und in den Buchhaltungsexporten taucht es nicht auf.',
		),
		offer: true,
	};
}

/**
 * Narrows an unknown value to a supported document type (default invoice).
 *
 * @param value - Raw document type as sent by the API.
 */
export function normalizeDocType(value?: string | null): DocType {
	return (value ?? '').trim().toLowerCase() === 'quote' ? 'quote' : 'invoice';
}

/**
 * True for an offer — the guard for "never an e-invoice" (R8).
 *
 * @param docType - Document type to inspect.
 */
export function isQuote(docType?: string | null): boolean {
	return normalizeDocType(docType) === 'quote';
}

/**
 * The wording of a document type.
 *
 * @param docType - Document type, defaults to invoice.
 */
export function labels(docType?: string | null): DocLabels {
	return isQuote(docType) ? quoteLabels() : invoiceLabels();
}

/**
 * The display title a type uses when the user did not type one.
 *
 * @param docType - Document type, defaults to invoice.
 */
export function defaultTitle(docType?: string | null): string {
	return labels(docType).defaultTitle;
}

/**
 * Adds whole days to an ISO date with UTC arithmetic, so the result never
 * drifts over a timezone boundary (mirrors addDaysIso on the server).
 *
 * @param iso - ISO date `YYYY-MM-DD`.
 * @param days - Days to add, may be negative.
 * @returns The shifted date, or the input when it is not a date.
 */
export function addDaysIso(iso: string, days: number): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) {
		return iso;
	}
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/**
 * The validity an offer gets when the user states nothing.
 *
 * @param issueDate - ISO date the offer is issued on.
 */
export function defaultValidUntil(issueDate: string): string {
	return addDaysIso(issueDate, QUOTE_VALIDITY_DAYS);
}

/** State of an offer, derived from its stored dates (mirrors QuoteState). */
export type QuoteState = 'draft' | 'open' | 'accepted' | 'rejected' | 'expired';

/** Fields the offer state is derived from. */
export interface QuoteLifecycle {
	/** Lifecycle status of the record. */
	status: string;
	/** Last day the offer stands, null for an open-ended offer. */
	validUntil: string | null;
	/** When the customer accepted the offer. */
	acceptedAt: string | null;
	/** When the customer declined the offer. */
	rejectedAt: string | null;
}

/**
 * State of an offer — the same rules the server applies, so list, detail page
 * and PDF agree without a second request.
 *
 * @param quote - Stored offer.
 * @param today - Day to compare the validity against, defaults to today.
 */
export function quoteState(quote: QuoteLifecycle, today: string = new Date().toISOString().slice(0, 10)): QuoteState {
	if (quote.acceptedAt) {
		return 'accepted';
	}
	// a discarded offer is off the table for good
	if (quote.rejectedAt || quote.status === 'cancelled') {
		return 'rejected';
	}
	if (quote.status === 'draft') {
		return 'draft';
	}
	if (quote.validUntil && /^\d{4}-\d{2}-\d{2}$/.test(quote.validUntil) && quote.validUntil < today) {
		return 'expired';
	}
	return 'open';
}

/**
 * Label of an offer state (German on the sight PDF — mirrors quoteStateLabel).
 *
 * @param state - Derived state.
 */
export function quoteStateLabel(state: QuoteState): string {
	switch (state) {
		case 'draft':
			return t('Entwurf');
		case 'open':
			return t('Offen');
		case 'accepted':
			return t('Angenommen');
		case 'rejected':
			return t('Abgelehnt');
		default:
			return t('Verfallen');
	}
}

/**
 * Label of the lifecycle status of a record (`draft`, `issued`, `cancelled`).
 *
 * @param status - Status as the API sends it.
 */
export function statusLabel(status: string): string {
	switch (status) {
		case 'draft':
			return t('Entwurf');
		case 'issued':
			return t('ausgestellt');
		case 'cancelled':
			return t('storniert');
		default:
			return status;
	}
}
