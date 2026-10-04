/**
 * R7.9: the three sample documents of the test print differ where layouts differ.
 */
import { expect } from 'chai';
import { calcTotals, validateInvoiceForIssue } from './invoice-model';
import { isPreviewSample, PREVIEW_SAMPLES, previewSampleDraft } from './preview-samples';

const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};

describe('preview samples (R7.9)', () => {
	it('knows exactly three samples', () => {
		expect([...PREVIEW_SAMPLES]).to.deep.equal(['full', 'small', 'credit']);
		expect(isPreviewSample('small')).to.equal(true);
		expect(isPreviewSample('bogus')).to.equal(false);
		expect(isPreviewSample(undefined)).to.equal(false);
	});

	it('builds a full invoice with two VAT rates, a line discount and a Skonto', () => {
		const draft = previewSampleDraft('full', seller);
		expect(new Set(draft.lines.map(line => line.vatRate))).to.deep.equal(new Set([19, 7]));
		expect(draft.lines.some(line => (line.discountPercent ?? 0) > 0)).to.equal(true);
		expect(draft.skontoPercent).to.be.greaterThan(0);
		expect(calcTotals(draft.lines).breakdown).to.have.length(2);
	});

	it('builds a small-business invoice without VAT and with its exemption text', () => {
		const draft = previewSampleDraft('small', seller);
		expect(draft.lines.every(line => line.vatRate === 0)).to.equal(true);
		expect(draft.lines[0].exemptionReason).to.contain('§ 19');
		expect(calcTotals(draft.lines).taxTotal).to.equal(0);
	});

	it('builds a credit note with its own title and a reference text', () => {
		const draft = previewSampleDraft('credit', seller);
		expect(draft.documentTitle).to.equal('Gutschrift');
		expect(draft.notes).to.contain('Storno zu Rechnung');
	});

	it('builds samples that would pass the issue check', () => {
		for (const sample of PREVIEW_SAMPLES) {
			const draft = previewSampleDraft(sample, seller);
			expect(validateInvoiceForIssue({ ...draft, seller }), sample).to.deep.equal([]);
		}
	});
});
