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
import {
	calcSkonto,
	calcTotals,
	formatDeliveryDateDe,
	lineNetUnitPrice,
	parseDeliveryPeriod,
	roundCents,
	type DeliveryPeriod,
	type ExemptionCategory,
} from './invoice-model';
import type { StoredInvoice } from './db';
import { loadIccProfile } from './fonts';

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
 * @param exemptionCategory - Category of a 0 % line, defaults to `E`.
 */
export function mapVatCategory(vatRate: number, exemptionCategory?: ExemptionCategory): VatCategoryCode {
	if (vatRate !== 0) {
		return VatCategoryCode.STANDARD_RATE;
	}
	switch (exemptionCategory) {
		case 'AE':
			return VatCategoryCode.REVERSE_CHARGE;
		case 'K':
			return VatCategoryCode.INTRA_COMMUNITY_SUPPLY;
		case 'G':
			return VatCategoryCode.FREE_EXPORT;
		case 'O':
			return VatCategoryCode.OUTSIDE_SCOPE;
		default:
			return VatCategoryCode.EXEMPT;
	}
}

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
 * Maps a stored invoice to the Factur-X input object.
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

	// BT-48 (buyer VAT identifier) and the buyer's tax number: EN 16931 wants them next
	// to the seller's identifiers as soon as a line carries the reverse charge or an
	// intra-community supply (BR-AE-02, BR-IC-11). Without them the KoSIT validator
	// rejects the document, so the buyer party is filled the same way as the seller.
	const buyerTax: { id: string; schemeId: 'VA' | 'FC' }[] = [];
	if (invoice.buyer.vatId?.trim()) {
		buyerTax.push({ id: invoice.buyer.vatId.trim(), schemeId: 'VA' });
	}
	if (invoice.buyer.taxNumber?.trim()) {
		buyerTax.push({ id: invoice.buyer.taxNumber.trim(), schemeId: 'FC' });
	}

	// BT-147/148 (cash discount) have no field in the library and no place in
	// the shipped ZUGFeRD XSD, so the terms travel as a document note with the
	// official subject code AAK (discount terms) — legible and XSD-valid.
	const skonto = calcSkonto(
		totals.grossTotal,
		invoice.skontoPercent,
		invoice.skontoDueDate ?? undefined,
		invoice.dueDate ?? undefined,
	);
	const notes: { content: string; subjectCode?: string }[] = [];
	if (invoice.notes?.trim()) {
		notes.push({ content: invoice.notes.trim() });
	}
	if (skonto.percent > 0 && !invoice.paid) {
		notes.push({
			subjectCode: 'AAK',
			content:
				`${skonto.percent} % Skonto bei Zahlung bis ${formatDeliveryDateDe(skonto.dueDate ?? '')} = ` +
				`${skonto.amount.toFixed(2)} EUR; Zahlbetrag dann ${skonto.payableNow.toFixed(2)} EUR.`,
		});
	}

	return {
		document: {
			id: invoice.number,
			issueDate: invoice.issueDate,
			typeCode: mapDocumentTypeCode(invoice.documentTitle),
			dueDate: invoice.dueDate ?? undefined,
			buyerReference: invoice.buyer.customerNumber?.trim() || undefined,
			notes: notes.length > 0 ? notes : undefined,
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
			taxRegistrations: buyerTax.length > 0 ? buyerTax : undefined,
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
				vatCategoryCode: mapVatCategory(line.vatRate, line.exemptionCategory),
				vatRatePercent: line.vatRate,
			};
		}),
		totals: {
			lineTotal: totals.netTotal,
			taxBasisTotal: totals.netTotal,
			taxTotal: totals.taxTotal,
			grandTotal: totals.grossTotal,
			// BT-9 may only deviate from the grand total through a prepayment
			// (BR-CO-16). A cash discount is conditional, not a prepayment, so
			// it travels as a note and BT-9 stays at the gross total. A paid
			// invoice is fully prepaid instead.
			prepaidAmount: invoice.paid ? totals.grossTotal : undefined,
			duePayableAmount: invoice.paid ? 0 : totals.grossTotal,
			currency: 'EUR',
		},
		vatBreakdown: totals.breakdown.map(entry => {
			// the 0 % breakdown entry aggregates all 0 % lines, so the category
			// and reason must be checked for consistency instead of taken
			// from an arbitrary line
			const zeroLines = entry.vatRate === 0 ? invoice.lines.filter(line => line.vatRate === 0) : [];
			const categories = new Set(zeroLines.map(line => line.exemptionCategory ?? 'E'));
			const reasons = [...new Set(zeroLines.map(line => line.exemptionReason?.trim()).filter(Boolean))];
			if (categories.size > 1 || reasons.length > 1) {
				throw new Error(
					`0% lines use different exemption categories (${[...categories].join('/')}) or reasons — ` +
						'split them into separate invoices or make them identical',
				);
			}
			return {
				categoryCode: mapVatCategory(entry.vatRate, [...categories][0]),
				ratePercent: entry.vatRate,
				taxableAmount: entry.net,
				taxAmount: entry.tax,
				exemptionReason: entry.vatRate === 0 ? reasons[0] : undefined,
			};
		}),
		payment: {
			meansCode: '58',
			iban: invoice.seller.iban?.trim() || undefined,
			bic: invoice.seller.bic?.trim() || undefined,
			paymentReference: invoice.number,
			dueDate: invoice.dueDate ?? undefined,
			termsDescription: invoice.paymentTerms ?? undefined,
		},
		delivery: {
			// validated at issue time; for a period only BT-72 goes through the
			// library, BT-74 is added by applyDeliveryPeriodEnd()
			date: parseDeliveryPeriod(invoice.deliveryDate)?.start,
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
	const withPeriod = applyBillingPeriod(xml, parseDeliveryPeriod(invoice.deliveryDate));
	const xsd = await validateXsd(withPeriod, profile);
	if (!xsd.valid) {
		throw new Error(`Factur-X XSD invalid: ${xsd.errors.map(e => e.message).join(' | ')}`);
	}
	return { xml: withPeriod, profile };
}

/**
 * Adds BG-26 Billing Period (BT-74/BT-75) when the invoice covers a service
 * period. The library's input model has no field for it and
 * `ram:UltimateDeliveryDateTime` does not exist in the shipped ZUGFeRD
 * flavours, so the node is injected here — the result is XSD-validated
 * afterwards, and the XSD sequence requires it right before
 * SpecifiedTradeSettlementHeaderMonetarySummation.
 *
 * @param xml - CII XML from the builder.
 * @param period - Parsed delivery period, or null.
 */
export function applyBillingPeriod(xml: string, period: DeliveryPeriod | null): string {
	if (!period?.end) {
		return xml;
	}
	const day = (iso: string): string =>
		`<udt:DateTimeString format="102">${iso.replace(/-/g, '')}</udt:DateTimeString>`;
	const node =
		`<ram:BillingSpecifiedPeriod><ram:StartDateTime>${day(period.start)}</ram:StartDateTime>` +
		`<ram:EndDateTime>${day(period.end)}</ram:EndDateTime></ram:BillingSpecifiedPeriod>`;
	const anchor = '<ram:SpecifiedTradeSettlementHeaderMonetarySummation>';
	const at = xml.indexOf(anchor);
	if (at < 0) {
		throw new Error('Cannot place the billing period: settlement summation not found');
	}
	// the XSD sequence is ApplicableTradeTax → BillingSpecifiedPeriod →
	// allowances → payment terms → summation, so the node has to follow the
	// header tax breakdown and not just precede the summation
	const taxEnd = xml.lastIndexOf('</ram:ApplicableTradeTax>', at);
	const insertAt = taxEnd > 0 ? taxEnd + '</ram:ApplicableTradeTax>'.length : at;
	return `${xml.slice(0, insertAt)}${node}${xml.slice(insertAt)}`;
}

/**
 * Embeds validated CII XML into a visual PDF, producing the hybrid file.
 *
 * The sight PDF is PDF/A-3b ready: `src/lib/fonts.ts` registers the embedded
 * Liberation Sans faces on the pdfkit document and supplies the sRGB profile
 * for `/OutputIntents`, so `embedFacturX` adds the PDF/A-3 metadata without
 * falling back to non-conformant output. The embedded XML stays the leading
 * part.
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
	// PDF/A-3 requires an `/OutputIntents` entry (ISO 19005-3 § 6.2.4.3).
	// Without the profile the library only writes its own log line, so the
	// adapter reports it too: a non-conformant hybrid PDF must not be archived
	// unnoticed.
	const iccProfile = loadIccProfile();
	if (!iccProfile) {
		console.warn(
			'[e-invoices] sRGB profile for /OutputIntents not found in the installed pdfkit — ' +
				'the hybrid PDF gets no output intent and is therefore not PDF/A-3b conformant. ' +
				'Reinstall dependencies so pdfkit ships data/sRGB_IEC61966_2_1.icc again.',
		);
	}
	const result = await embedFacturX({
		pdf: pdfBytes,
		xml,
		profile,
		flavor: Flavor.ZUGFERD,
		validateBeforeEmbed: false,
		validateXsd: false,
		addPdfA3Metadata: true,
		rgbIccProfile: iccProfile,
		unembeddedFonts: 'warn',
		meta: { title, creator: 'ioBroker.e-invoices' },
	});
	return result.pdf;
}
