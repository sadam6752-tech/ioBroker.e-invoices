/**
 * Sample documents for the layout studio's test print (R7.9).
 *
 * One sample is not enough to say "the layout fits in every case": a full invoice with two
 * VAT rates and a discount, a small-business invoice (§ 19 UStG, no VAT line, the exemption
 * text instead) and a credit note (other title, reference text) lay out differently. The
 * test print can choose between them.
 */
import type { InvoiceDraftInput, Party } from './invoice-model';

/** The samples the test print offers. */
export const PREVIEW_SAMPLES = ['full', 'small', 'credit'] as const;

/** Name of a sample. */
export type PreviewSample = (typeof PREVIEW_SAMPLES)[number];

/**
 * True for a sample name.
 *
 * @param value - Value from a request.
 */
export function isPreviewSample(value: unknown): value is PreviewSample {
	return typeof value === 'string' && (PREVIEW_SAMPLES as readonly string[]).includes(value);
}

/**
 * Builds the draft of one sample.
 *
 * @param sample - Which sample.
 * @param seller - Seller to print (the company of the template or the built-in one).
 */
export function previewSampleDraft(sample: PreviewSample, seller: Party): InvoiceDraftInput {
	const buyer: Party = {
		name: 'Kunde AG',
		street: 'Kundenweg 5',
		zip: '80331',
		city: 'München',
		country: 'DE',
		customerNumber: 'K-42',
	};
	const base = {
		seller,
		buyer,
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		dueDate: '2026-10-12',
		currency: 'EUR',
	};
	if (sample === 'small') {
		return {
			...base,
			lines: [
				{
					description: 'Beratung',
					quantity: 3,
					unit: 'Std',
					unitPriceNet: 45,
					vatRate: 0,
					exemptionReason: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
				},
			],
			documentTitle: 'Rechnung',
			notes: 'Dies ist eine Layout-Vorschau (Kleinunternehmer).',
			paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
		};
	}
	if (sample === 'credit') {
		return {
			...base,
			lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
			documentTitle: 'Gutschrift',
			notes: 'Storno zu Rechnung 2026-00-001 – Dies ist eine Layout-Vorschau.',
		};
	}
	return {
		...base,
		lines: [
			{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
			{ description: 'Anfahrt', quantity: 1, unit: 'Stk', unitPriceNet: 50, vatRate: 19 },
			{ description: 'Fachbuch', quantity: 2, unit: 'Stk', unitPriceNet: 24.9, vatRate: 7, discountPercent: 10 },
		],
		documentTitle: 'Rechnung',
		notes: 'Dies ist eine Layout-Vorschau.',
		paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
		skontoPercent: 2,
		skontoDueDate: '2026-10-05',
	};
}
