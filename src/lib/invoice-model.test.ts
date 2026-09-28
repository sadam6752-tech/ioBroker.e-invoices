/**
 * Unit tests for the invoice domain model (P1).
 */
import { expect } from 'chai';
import {
	blankDraft,
	calcTotals,
	formatInvoiceNumber,
	todayIso,
	validateInvoiceForIssue,
	type InvoiceDraftInput,
	type Party,
} from './invoice-model';

const seller: Party = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
};

const buyer: Party = {
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
};

function validDraft(): InvoiceDraftInput {
	return {
		seller,
		buyer,
		lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		currency: 'EUR',
	};
}

describe('invoice-model => formatInvoiceNumber', () => {
	it('formats zero-padded numbers', () => {
		expect(formatInvoiceNumber(2026, 1)).to.equal('2026-0001');
		expect(formatInvoiceNumber(2026, 42)).to.equal('2026-0042');
	});

	it('rejects invalid year/sequence', () => {
		expect(() => formatInvoiceNumber(1999, 1)).to.throw();
		expect(() => formatInvoiceNumber(2026, 0)).to.throw();
	});
});

describe('invoice-model => calcTotals', () => {
	it('calculates 19% tax correctly', () => {
		const totals = calcTotals([{ description: 'A', quantity: 2, unit: 'Stk', unitPriceNet: 100, vatRate: 19 }]);
		expect(totals.netTotal).to.equal(200);
		expect(totals.taxTotal).to.equal(38);
		expect(totals.grossTotal).to.equal(238);
		expect(totals.breakdown).to.have.lengthOf(1);
	});

	it('groups mixed rates and applies discounts', () => {
		const totals = calcTotals([
			{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 100, vatRate: 19 },
			{ description: 'B', quantity: 1, unit: 'Stk', unitPriceNet: 100, vatRate: 7, discountPercent: 10 },
		]);
		// B net = 90, tax 6.30
		expect(totals.netTotal).to.equal(190);
		expect(totals.taxTotal).to.equal(25.3);
		expect(totals.grossTotal).to.equal(215.3);
		expect(totals.breakdown).to.have.lengthOf(2);
	});

	it('rejects unsupported VAT rates', () => {
		expect(() =>
			calcTotals([{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 16 }]),
		).to.throw();
	});
});

describe('invoice-model => blankDraft', () => {
	it('creates an empty skeleton with todays date', () => {
		const draft = blankDraft('2026-09-28');
		expect(draft.lines).to.deep.equal([]);
		expect(draft.issueDate).to.equal('2026-09-28');
		expect(draft.seller.country).to.equal('DE');
		expect(calcTotals(draft.lines).grossTotal).to.equal(0);
	});

	it('todayIso returns YYYY-MM-DD', () => {
		expect(todayIso(new Date('2026-01-15T12:00:00Z'))).to.equal('2026-01-15');
	});
});

describe('invoice-model => validateInvoiceForIssue', () => {
	it('accepts a complete draft', () => {
		expect(validateInvoiceForIssue(validDraft())).to.deep.equal([]);
	});

	it('requires seller tax id and buyer address', () => {
		const draft = validDraft();
		draft.seller = { ...seller, vatId: undefined, taxNumber: undefined };
		draft.buyer = { ...buyer, city: '  ' };
		const errors = validateInvoiceForIssue(draft);
		expect(errors.join(' ')).to.contain('Steuernummer');
		expect(errors.join(' ')).to.contain('Buyer');
	});

	it('requires lines and exemption reasons', () => {
		const empty = validDraft();
		empty.lines = [];
		expect(validateInvoiceForIssue(empty).length).to.be.greaterThan(0);

		const exempt = validDraft();
		exempt.lines = [{ description: 'Buch', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 0 }];
		expect(validateInvoiceForIssue(exempt).join(' ')).to.contain('exemption');
	});
});
