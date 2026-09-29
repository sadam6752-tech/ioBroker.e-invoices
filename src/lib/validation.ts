/**
 * Artifact validation for ioBroker.e-invoices (P3).
 *
 * Two layers, matching the BMF distinction:
 * - format errors: the XML is technically no e-invoice (XSD, offline via WASM)
 * - business errors: our own EN 16931 plausibility checks (Pflicht markers,
 *   sum consistency between snapshot and lines)
 */
import { validateXsd } from '@stackforge-eu/factur-x';
import { calcTotals, roundCents } from './invoice-model';
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
 * Escapes a value the same way the XML serializer does, for presence checks.
 *
 * @param value - Raw text from the invoice.
 */
function xmlText(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Reads one element's numeric value, or undefined when absent/empty.
 *
 * @param xml - Generated CII XML string.
 * @param tag - Fully qualified element name.
 */
function elementValue(xml: string, tag: string): number | undefined {
	const match = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(xml);
	if (!match) {
		return undefined;
	}
	const value = Number(match[1]);
	return Number.isFinite(value) ? value : undefined;
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

	if (!/<[A-Za-z0-9]*:?CrossIndustryInvoice[\s>]/.test(xml)) {
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

	if (invoice.number && !xml.includes(xmlText(invoice.number))) {
		businessErrors.push('Invoice number missing in XML');
	}
	const typeCode = (invoice.documentTitle || '').toLowerCase().includes('gutschrift') ? '381' : '380';
	if (!xml.includes(`<ram:TypeCode>${typeCode}</ram:TypeCode>`)) {
		businessErrors.push(`Document type code ${typeCode} missing in XML`);
	}
	// compare escaped: "Müller & Sohn GmbH" is stored as "Müller &amp; Sohn GmbH"
	if (!xml.includes(xmlText(invoice.seller.name)) || !xml.includes(xmlText(invoice.buyer.name))) {
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
		// BR-CO-10: the header sum must equal the sum of the line totals,
		// and BR-CO-14: the tax basis must equal the net total.
		const lineTotals = [...xml.matchAll(/<ram:LineTotalAmount>([^<]*)</g)].map(m => Number(m[1]));
		const sumOfLines = lineTotals.slice(0, -1).reduce((sum, value) => roundCents(sum + value), 0);
		if (lineTotals.length > 1 && Math.abs(roundCents(sumOfLines - lineTotals[lineTotals.length - 1])) > 0.005) {
			businessErrors.push(`Line sum ${sumOfLines.toFixed(2)} differs from header line total`);
		}
		const basis = elementValue(xml, 'ram:TaxBasisTotalAmount');
		if (basis !== undefined && Math.abs(basis - fresh.netTotal) > 0.005) {
			businessErrors.push(`Tax basis ${basis.toFixed(2)} differs from net total ${fresh.netTotal.toFixed(2)}`);
		}
		const grand = elementValue(xml, 'ram:GrandTotalAmount');
		if (grand !== undefined && Math.abs(grand - fresh.grossTotal) > 0.005) {
			businessErrors.push(`Grand total ${grand.toFixed(2)} differs from ${fresh.grossTotal.toFixed(2)}`);
		}
		for (const entry of fresh.breakdown) {
			// BR-CO-17: tax must equal round(basis × rate / 100)
			const expected = roundCents((entry.net * entry.vatRate) / 100);
			if (Math.abs(expected - entry.tax) > 0.005) {
				businessErrors.push(
					`Tax ${entry.tax.toFixed(2)} at ${entry.vatRate}% != expected ${expected.toFixed(2)}`,
				);
			}
		}
	} catch (error) {
		businessErrors.push(`Totals check crashed: ${(error as Error).message}`);
	}

	return { formatErrors, businessErrors };
}
