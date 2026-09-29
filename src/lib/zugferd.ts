/**
 * ZUGFeRD/Factur-X generation for ioBroker.e-invoices (P3).
 *
 * Thin adapter over `@stackforge-eu/factur-x` (EUPL-1.2, plain npm
 * dependency — no code copied): maps our domain model to CII input,
 * generates the structured XML, XSD-validates it offline (libxml2-wasm)
 * and embeds the hybrid PDF/A-3.
 *
 * Supported profiles in v1: BASIC and EN16931. MINIMUM and BASIC-WL are
 * rejected on purpose (no valid e-invoices under German fiscal law).
 */
import {
	DocumentTypeCode,
	Flavor,
	Profile,
	UnitCode,
	VatCategoryCode,
	buildXml,
	embedFacturX,
	validateInput,
	validateXsd,
	type FacturXInvoiceInput,
} from '@stackforge-eu/factur-x';
import { calcTotals, lineNetUnitPrice, roundCents } from './invoice-model';
import type { StoredInvoice } from './db';

/** Profiles this adapter can generate in v1. */
export type SupportedProfile = 'BASIC' | 'EN16931';

/**
 * Resolves our stored profile string to the library enum.
 * Rejects MINIMUM/BASIC-WL and unknown/future profiles loudly.
 *
 * @param profile - Stored profile string.
 */
export function resolveProfile(profile: string): Profile {
	if (profile === 'BASIC') {
		return Profile.BASIC;
	}
	if (profile === 'EN16931') {
		return Profile.EN16931;
	}
	throw new Error(`Profile not supported in v1 (need BASIC or EN16931): ${profile}`);
}

/**
 * Maps our free-text unit to a UN/CEFACT Recommendation 20 code.
 *
 * @param unit - Unit as entered by the user (Stk, Std, kg, ...).
 */
export function mapUnitCode(unit: string): UnitCode {
	const u = unit.trim().toLowerCase();
	if (u === 'std' || u === 'h' || u === 'hour' || u === 'std.' || u === 'stunden') {
		return UnitCode.HOUR;
	}
	if (u === 'kg' || u === 'kilo' || u === 'kilogramm') {
		return UnitCode.KILOGRAM;
	}
	if (u === 'l' || u === 'ltr' || u === 'liter') {
		return UnitCode.LITRE;
	}
	if (u === 'm' || u === 'meter') {
		return UnitCode.METRE;
	}
	if (u === 'tag' || u === 'tage' || u === 'day') {
		return UnitCode.DAY;
	}
	return UnitCode.UNIT;
}

/**
 * Maps a VAT rate to its UNTDID 5305 category.
 * v1 knows domestic standard rates (S) and documented exemptions (E).
 *
 * @param vatRate - VAT rate in percent.
 */
export function mapVatCategory(vatRate: number): VatCategoryCode {
	if (vatRate === 0) {
		return VatCategoryCode.EXEMPT;
	}
	return VatCategoryCode.STANDARD_RATE;
}

/**
 * Maps a stored invoice to the Factur-X input object.
/**
 * Maps the German document title to the UNTDID 1001 code list (BT-3).
 * Everything that is not explicitly a progress or correction invoice stays a
 * commercial invoice (380) — that is what the German EN 16931 profile expects.
 *
 * @param documentTitle - Free-text title chosen in the PWA.
 */
export function mapDocumentTypeCode(documentTitle?: string): DocumentTypeCode {
	const title = (documentTitle ?? '').toLowerCase();
	if (title.includes('gutschrift') || title.includes('credit')) {
		return DocumentTypeCode.CREDIT_NOTE;
	}
	if (title.includes('abschlag') || title.includes('zwischenrechnung')) {
		return DocumentTypeCode.PARTIAL_INVOICE;
	}
	if (title.includes('schlussrechnung') || title.includes('final')) {
		return DocumentTypeCode.FINAL_PAYMENT_REQUEST;
	}
	if (title.includes('korrektur')) {
		return DocumentTypeCode.CORRECTED_INVOICE;
	}
	return DocumentTypeCode.COMMERCIAL_INVOICE;
}

/**
 * Throws when mandatory generation data (number, parties, lines) is missing.
 *
 * @param invoice - Issued (or issuable) stored invoice.
 */
export function toFacturXInput(invoice: StoredInvoice): FacturXInvoiceInput {
	if (!invoice.number) {
		throw new Error('Invoice has no number yet — issue it before generating XML');
	}
	const totals = calcTotals(invoice.lines);

	const sellerTax: { id: string; schemeId: 'VA' | 'FC' }[] = [];
	if (invoice.seller.vatId?.trim()) {
		sellerTax.push({ id: invoice.seller.vatId.trim(), schemeId: 'VA' });
	}
	if (invoice.seller.taxNumber?.trim()) {
		sellerTax.push({ id: invoice.seller.taxNumber.trim(), schemeId: 'FC' });
	}

	return {
		document: {
			id: invoice.number,
			issueDate: invoice.issueDate,
			typeCode: mapDocumentTypeCode(invoice.documentTitle),
			dueDate: invoice.dueDate ?? undefined,
			buyerReference: invoice.buyer.customerNumber?.trim() || undefined,
			notes: invoice.notes?.trim() ? [{ content: invoice.notes.trim() }] : undefined,
		},
		seller: {
			name: invoice.seller.name,
			address: {
				line1: invoice.seller.street,
				city: invoice.seller.city,
				postalCode: invoice.seller.zip,
				country: invoice.seller.country || 'DE',
			},
			taxRegistrations: sellerTax.length > 0 ? sellerTax : undefined,
			electronicAddress: invoice.seller.email?.trim()
				? { value: invoice.seller.email.trim(), schemeID: 'EM' }
				: undefined,
			contact:
				invoice.seller.email?.trim() || invoice.seller.phone?.trim()
					? {
							email: invoice.seller.email?.trim() || undefined,
							phone: invoice.seller.phone?.trim() || undefined,
						}
					: undefined,
		},
		buyer: {
			name: invoice.buyer.name,
			address: {
				line1: invoice.buyer.street,
				city: invoice.buyer.city,
				postalCode: invoice.buyer.zip,
				country: invoice.buyer.country || 'DE',
			},
			electronicAddress: invoice.buyer.email?.trim()
				? { value: invoice.buyer.email.trim(), schemeID: 'EM' }
				: undefined,
			contact:
				invoice.buyer.email?.trim() || invoice.buyer.phone?.trim()
					? {
							email: invoice.buyer.email?.trim() || undefined,
							phone: invoice.buyer.phone?.trim() || undefined,
						}
					: undefined,
		},
		lines: invoice.lines.map((line, index) => {
			const discount = line.discountPercent ?? 0;
			const netUnit = lineNetUnitPrice(line);
			return {
				id: String(index + 1),
				name: line.description,
				description: line.details?.trim() || undefined,
				sellerAssignedId: line.sku?.trim() || undefined,
				quantity: line.quantity,
				unitCode: mapUnitCode(line.unit || 'Stk'),
				unitPrice: netUnit,
				grossUnitPrice: discount > 0 ? line.unitPriceNet : undefined,
				priceDiscount: discount > 0 ? roundCents(line.unitPriceNet - netUnit) : undefined,
				vatCategoryCode: mapVatCategory(line.vatRate),
				vatRatePercent: line.vatRate,
			};
		}),
		totals: {
			lineTotal: totals.netTotal,
			taxBasisTotal: totals.netTotal,
			taxTotal: totals.taxTotal,
			grandTotal: totals.grossTotal,
			duePayableAmount: totals.grossTotal,
			currency: 'EUR',
		},
		vatBreakdown: totals.breakdown.map(entry => ({
			categoryCode: entry.vatRate === 0 ? VatCategoryCode.EXEMPT : VatCategoryCode.STANDARD_RATE,
			ratePercent: entry.vatRate,
			taxableAmount: entry.net,
			taxAmount: entry.tax,
			exemptionReason:
				entry.vatRate === 0
					? invoice.lines.find(line => line.vatRate === 0 && line.exemptionReason?.trim())?.exemptionReason
					: undefined,
		})),
		payment: {
			meansCode: '58',
			iban: invoice.seller.iban?.trim() || undefined,
			bic: invoice.seller.bic?.trim() || undefined,
			paymentReference: invoice.number,
			dueDate: invoice.dueDate ?? undefined,
			termsDescription: invoice.paymentTerms ?? undefined,
		},
		delivery: {
			// validated as a plain ISO date at issue time, no period support
			date: invoice.deliveryDate,
		},
	};
}

/** Generated XML plus the profile it was built for. */
export interface GeneratedXml {
	/** CII XML string (the leading part of the e-invoice). */
	xml: string;
	/** Library profile enum used. */
	profile: Profile;
}

/**
 * Validates the input, builds the CII XML and XSD-validates it.
 * Throws with all messages when any step fails.
 *
 * @param invoice - Stored invoice with an assigned number.
 */
export async function generateInvoiceXml(invoice: StoredInvoice): Promise<GeneratedXml> {
	const profile = resolveProfile(invoice.profile);
	const input = toFacturXInput(invoice);

	const inputCheck = validateInput(input, profile, Flavor.ZUGFERD);
	if (!inputCheck.valid) {
		throw new Error(
			`Factur-X input invalid: ${inputCheck.errors.map(e => `${e.field}: ${e.message}`).join(' | ')}`,
		);
	}

	const xml = buildXml(input, profile, Flavor.ZUGFERD);
	const xsd = await validateXsd(xml, profile);
	if (!xsd.valid) {
		throw new Error(`Factur-X XSD invalid: ${xsd.errors.map(e => e.message).join(' | ')}`);
	}
	return { xml, profile };
}

/**
 * Embeds validated CII XML into a visual PDF, producing the hybrid file.
 * Note: pdfkit sight PDFs use standard fonts (not embedded), so the result
 * is a valid hybrid container but strictly not PDF/A-3b conformant until
 * font embedding lands (P4 hardening). The XML stays the leading part.
 *
 * @param pdfBytes - Visual PDF (e.g. from renderInvoicePdf).
 * @param xml - Validated CII XML string.
 * @param profileName - Stored profile string (BASIC or EN16931).
 * @param title - PDF document title.
 */
export async function embedHybridPdf(
	pdfBytes: Buffer | Uint8Array,
	xml: string,
	profileName: string,
	title: string,
): Promise<Uint8Array> {
	const profile = resolveProfile(profileName);
	const result = await embedFacturX({
		pdf: pdfBytes,
		xml,
		profile,
		flavor: Flavor.ZUGFERD,
		validateBeforeEmbed: false,
		validateXsd: false,
		addPdfA3Metadata: true,
		unembeddedFonts: 'warn',
		meta: { title, creator: 'ioBroker.e-invoices' },
	});
	return result.pdf;
}
