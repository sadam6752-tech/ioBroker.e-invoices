/**
 * Artifact validation for ioBroker.e-invoices (P3).
 *
 * Two layers, matching the BMF distinction:
 * - format errors: the XML is technically no e-invoice (XSD, offline via WASM)
 * - business errors: our own EN 16931 plausibility checks (Pflicht markers,
 *   sum consistency between snapshot and lines)
 */
import { validateXsd } from '@stackforge-eu/factur-x';
import { calcTotals } from './invoice-model';
import { resolveProfile } from './zugferd';
import type { StoredInvoice } from './db';

/** Split validation outcome. */
export interface ArtifactValidation {
	/** Technical errors — file is no valid e-invoice. */
	formatErrors: string[];
	/** Content/business-rule violations. */
	businessErrors: string[];
}

/**
 * Validates generated CII XML against XSD and business rules.
 *
 * @param invoice - Stored invoice the XML was built from.
 * @param xml - Generated CII XML string.
 */
export async function validateArtifacts(invoice: StoredInvoice, xml: string): Promise<ArtifactValidation> {
	const formatErrors: string[] = [];
	const businessErrors: string[] = [];

	if (!xml.includes('CrossIndustryInvoice')) {
		formatErrors.push('Missing CII root element CrossIndustryInvoice');
	}
	try {
		const profile = resolveProfile(invoice.profile);
		const xsd = await validateXsd(xml, profile);
		for (const error of xsd.errors) {
			formatErrors.push(error.line ? `Line ${error.line}: ${error.message}` : error.message);
		}
	} catch (error) {
		formatErrors.push(`XSD validation crashed: ${(error as Error).message}`);
	}

	if (invoice.number && !xml.includes(invoice.number)) {
		businessErrors.push('Invoice number missing in XML');
	}
	const typeCode = (invoice.documentTitle || '').toLowerCase().includes('gutschrift') ? '381' : '380';
	if (!xml.includes(`<ram:TypeCode>${typeCode}</ram:TypeCode>`)) {
		businessErrors.push(`Document type code ${typeCode} missing in XML`);
	}
	if (!xml.includes(invoice.seller.name) || !xml.includes(invoice.buyer.name)) {
		businessErrors.push('Seller or buyer name missing in XML');
	}
	if (!xml.includes('<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>')) {
		businessErrors.push('Currency EUR missing in XML');
	}
	try {
		const fresh = calcTotals(invoice.lines);
		if (Math.abs(fresh.grossTotal - invoice.totals.grossTotal) > 0.005) {
			businessErrors.push('Stored totals differ from recalculated line totals');
		}
		if (!xml.includes(fresh.grossTotal.toFixed(2))) {
			businessErrors.push('Grand total amount missing in XML');
		}
	} catch (error) {
		businessErrors.push(`Totals check crashed: ${(error as Error).message}`);
	}

	return { formatErrors, businessErrors };
}
