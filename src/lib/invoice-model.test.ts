/**
 * Unit tests for the invoice domain model (P1).
 */
import { expect } from 'chai';
import {
	blankDraft,
	calcTotals,
	formatInvoiceNumber,
	isIsoDate,
	lineNetAmount,
	lineNetUnitPrice,
	normalizeEmployeeCode,
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
	it('formats year-employee-sequence numbers', () => {
		expect(formatInvoiceNumber(2026, '01', 1)).to.equal('2026-01-001');
		expect(formatInvoiceNumber(2026, 'ab', 42)).to.equal('2026-AB-042');
	});

	it('rejects invalid year/sequence', () => {
		expect(() => formatInvoiceNumber(1999, '01', 1)).to.throw();
		expect(() => formatInvoiceNumber(2026, '01', 0)).to.throw();
	});
});

describe('invoice-model => normalizeEmployeeCode', () => {
	it('uppercases and defaults to 00', () => {
		expect(normalizeEmployeeCode('ab')).to.equal('AB');
		expect(normalizeEmployeeCode(undefined)).to.equal('00');
		expect(normalizeEmployeeCode('  ')).to.equal('00');
		expect(() => normalizeEmployeeCode('a/b')).to.throw();
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

	it('rounds each line exactly once so line nets match the tax basis (BR-CO-10)', () => {
		const line = { description: 'A', quantity: 3, unit: 'Stk', unitPriceNet: 0.335, vatRate: 19 };
		expect(lineNetAmount(line)).to.equal(1.01);
		expect(lineNetUnitPrice(line) * line.quantity).to.be.closeTo(1.01, 0.0001);
		const totals = calcTotals([line]);
		expect(totals.netTotal).to.equal(lineNetAmount(line));
		expect(totals.taxTotal).to.equal(0.19);
	});

	it('rejects a NaN discount instead of freezing null totals', () => {
		expect(() =>
			calcTotals([
				{
					description: 'A',
					quantity: 1,
					unit: 'Stk',
					unitPriceNet: 100,
					vatRate: 19,
					discountPercent: Number.NaN,
				},
			]),
		).to.throw(/Discount/);
	});

	it('rejects a delivery period instead of truncating it silently', () => {
		const draft = validDraft();
		draft.deliveryDate = '2026-10-01..2026-10-31';
		const errors = validateInvoiceForIssue(draft);
		expect(errors.join(' | ')).to.contain('Delivery/service date');
	});

	it('rejects impossible and non-ISO dates', () => {
		expect(isIsoDate('2026-02-31')).to.equal(false);
		expect(isIsoDate('2026-13-01')).to.equal(false);
		expect(isIsoDate('2026-00-10')).to.equal(false);
		expect(isIsoDate('29.09.2026')).to.equal(false);
		expect(isIsoDate('2026-02-28')).to.equal(true);
		expect(isIsoDate('2024-02-29')).to.equal(true);
		expect(isIsoDate('2026-02-29')).to.equal(false);
	});

	it('rejects unsupported VAT rates', () => {
		expect(() =>
			calcTotals([{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 16 }]),
		).to.throw();
	});

	it('rounds tax from the rate basis (BR-CO-17), not from line sums', () => {
		const totals = calcTotals([
			{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
			{ description: 'B', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
			{ description: 'C', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
		]);
		expect(totals.netTotal).to.equal(100.02);
		expect(totals.taxTotal).to.equal(19);
		expect(totals.breakdown[0].tax).to.equal(Math.round((100.02 * 19) / 100));
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
