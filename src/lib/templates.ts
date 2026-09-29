/**
 * Layout templates for ioBroker.e-invoices (P4c).
 *
 * A template separates invoice content (database/XML) from presentation
 * (PDF sight component). Every issued invoice freezes the template id, so
 * templates are versioned and never edited in place.
 *
 * The Pflichtfeld-Wächter (validateTemplate) blocks any template that
 * would hide German Pflichtangaben (§ 14 Abs. 4 UStG): parties, positions,
 * totals, meta and all table columns are locked on in v1. Everything else
 * (logo, colors, optional blocks, footer) is freely editable.
 */

/** Logo placement on the sight PDF. */
export type LogoPosition = 'left' | 'right' | 'center';

/** Embedded logo reference (file lives in the mountpoint). */
export interface TemplateLogo {
	/** Mountpoint path, e.g. `logos/<templateId>.png`. */
	path: string;
	/** Placement. */
	position: LogoPosition;
	/** Width in mm, 10–80. */
	widthMm: number;
}

/** Toggleable content blocks. */
export interface TemplateBlocks {
	/** Document title (Rechnung/Gutschrift). */
	title: boolean;
	/** Number, issue/delivery dates. */
	meta: boolean;
	/** Seller + buyer addresses. */
	parties: boolean;
	/** Line items table. */
	positions: boolean;
	/** Totals block. */
	totals: boolean;
	/** Payment block (IBAN, terms). */
	payment: boolean;
	/** Notes + exemption hints. */
	notes: boolean;
}

/** Layout template definition (stored as JSON, versioned). */
export interface LayoutTemplate {
	/** Schema version, always 1 in v1. */
	version: 1;
	/** Display name. */
	name: string;
	/** Linked company profile for previews (optional). */
	companyId?: string;
	/** Logo reference (optional). */
	logo?: TemplateLogo;
	/** Hex colors. */
	colors: { primary: string; text: string; muted: string };
	/** Show seller e-mail in the header. */
	showEmail: boolean;
	/** Show buyer customer number (BT-10). */
	showCustomerNumber: boolean;
	/** Show payment terms when set. */
	showPaymentTerms: boolean;
	/** Free footer text (max 500 chars). */
	footerText: string;
	/** Show § 14b archive hint for real-estate cases. */
	showArchiveHint: boolean;
	/** Show page numbers. */
	showPageNumbers: boolean;
	/** Show the 4-box company footer (address, contact, bank, tax). */
	showFooterBoxes: boolean;
	/** Show the auto address tagline under the header. */
	showTagline: boolean;
	/** Intro sentence under the title (max 300 chars). */
	introText: string;
	/** Closing sentence above the greeting (max 300 chars). */
	closingText: string;
	/** Signature name under the greeting (max 80 chars, seller fallback). */
	signatureName: string;
	/** Extra header lines, e.g. Geschäftsführer (max 200 chars). */
	headerExtra: string;
	/** Content block toggles. */
	blocks: TemplateBlocks;
}

/** Default template (blue, right logo slot, everything visible). */
export const DEFAULT_TEMPLATE: LayoutTemplate = {
	version: 1,
	name: 'Standard',
	colors: { primary: '#1a56db', text: '#111827', muted: '#555555' },
	showEmail: true,
	showCustomerNumber: true,
	showPaymentTerms: true,
	footerText: '',
	showArchiveHint: false,
	showPageNumbers: false,
	showFooterBoxes: true,
	showTagline: true,
	introText: 'Hiermit stelle ich Ihnen folgende Positionen in Rechnung.',
	closingText: 'Bei Rückfragen stehe ich selbstverständlich jederzeit gerne zur Verfügung.',
	signatureName: '',
	headerExtra: '',
	blocks: { title: true, meta: true, parties: true, positions: true, totals: true, payment: true, notes: true },
};

/** Archive hint for § 14b Abs. 1 S. 5 UStG (real-estate supplies). */
export const ARCHIVE_HINT =
	'Hinweis: Diese Rechnung ist vom Leistungsempfänger zwei Jahre aufzubewahren (§ 14b Abs. 1 Satz 5 UStG).';

function isHexColor(value: unknown): boolean {
	return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Pflichtfeld-Wächter: rejects templates that would hide mandatory
 * invoice content. Returns human-readable errors (German); empty = OK.
 * Fields added after v1 (showTagline, texts, signature, headerExtra)
 * are optional so templates stored earlier stay usable; the renderer
 * falls back to defaults for missing values.
 *
 * @param template - Untrusted template candidate (e.g. from the API/PWA).
 */
export function validateTemplate(template: unknown): string[] {
	const errors: string[] = [];
	if (typeof template !== 'object' || template === null) {
		return ['Template muss ein Objekt sein'];
	}
	const t = template as Record<string, unknown>;
	if (t.version !== 1) {
		errors.push('Template version muss 1 sein');
	}
	if (typeof t.name !== 'string' || t.name.trim().length === 0 || t.name.trim().length > 80) {
		errors.push('Name muss 1–80 Zeichen lang sein');
	}
	const colors = t.colors as Record<string, unknown> | undefined;
	if (!colors || !isHexColor(colors.primary) || !isHexColor(colors.text) || !isHexColor(colors.muted)) {
		errors.push('Farben primary/text/muted müssen Hex (#rrggbb) sein');
	}
	for (const key of [
		'showEmail',
		'showCustomerNumber',
		'showPaymentTerms',
		'showArchiveHint',
		'showPageNumbers',
	] as const) {
		if (typeof t[key] !== 'boolean') {
			errors.push(`${key} muss true/false sein`);
		}
	}
	if (t.showTagline !== undefined && typeof t.showTagline !== 'boolean') {
		errors.push('showTagline muss true/false sein');
	}
	if (t.showFooterBoxes !== undefined && typeof t.showFooterBoxes !== 'boolean') {
		errors.push('showFooterBoxes muss true/false sein');
	}
	if (t.showTagline !== undefined && typeof t.showTagline !== 'boolean') {
		errors.push('showTagline muss true/false sein');
	}
	if (typeof t.footerText !== 'string' || t.footerText.length > 500) {
		errors.push('Fußzeile muss Text mit max. 500 Zeichen sein');
	}
	for (const [key, max] of [
		['introText', 300],
		['closingText', 300],
		['headerExtra', 200],
	] as const) {
		const value: unknown = t[key];
		if (value !== undefined && (typeof value !== 'string' || value.length > max)) {
			errors.push(`${key} muss Text mit max. ${max} Zeichen sein`);
		}
	}
	const signature: unknown = t.signatureName;
	if (signature !== undefined && (typeof signature !== 'string' || signature.length > 80)) {
		errors.push('signatureName muss Text mit max. 80 Zeichen sein');
	}
	const companyId: unknown = t.companyId;
	if (companyId !== undefined && (typeof companyId !== 'string' || companyId.length > 80)) {
		errors.push('companyId muss Text mit max. 80 Zeichen sein');
	}
	const blocks = t.blocks as Record<string, unknown> | undefined;
	if (!blocks) {
		errors.push('blocks-Objekt fehlt');
	} else {
		// Locked on: these carry § 14 Pflichtangaben and must stay visible.
		for (const key of ['title', 'meta', 'parties', 'positions', 'totals'] as const) {
			if (blocks[key] !== true) {
				errors.push(`Block ${key} enthält Pflichtangaben und darf nicht deaktiviert werden`);
			}
		}
		for (const key of ['payment', 'notes'] as const) {
			if (typeof blocks[key] !== 'boolean') {
				errors.push(`Block ${key} muss true/false sein`);
			}
		}
	}
	const logo = t.logo as Record<string, unknown> | undefined;
	if (logo !== undefined) {
		if (typeof logo.path !== 'string' || logo.path.trim().length === 0) {
			errors.push('Logo braucht einen Dateipfad');
		}
		if (logo.position !== 'left' && logo.position !== 'right' && logo.position !== 'center') {
			errors.push('Logo-Position muss left/right/center sein');
		}
		if (typeof logo.widthMm !== 'number' || logo.widthMm < 10 || logo.widthMm > 500) {
			errors.push('Logo-Breite muss 10–500 mm sein');
		}
	}
	return errors;
}
