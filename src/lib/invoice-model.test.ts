/**
 * Unit tests for the invoice domain model (P1).
 */
import { expect } from 'chai';
import {
	blankDraft,
	calcSkonto,
	calcTotals,
	formatInvoiceNumber,
	formatDeliveryDateDe,
	isIsoDate,
	lineNetAmount,
	parseDeliveryPeriod,
	renderInvoiceNumber,
	lineNetUnitPrice,
	normalizeEmployeeCode,
	normalizeNumberFormat,
	todayIso,
	validateInvoiceForIssue,
	addDaysIso,
	defaultDocumentTitle,
	defaultValidUntil,
	documentLabels,
	DOCUMENT_TYPES,
	INVOICE_TITLES,
	isQuote,
	normalizeDocumentType,
	QUOTE_TITLES,
	QUOTE_VALIDITY_DAYS,
	quoteState,
	quoteStateLabel,
	type InvoiceDraftInput,
	type Party,
	type QuoteLifecycle,
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

describe('invoice-model => number format', () => {
	it('accepts the documented tokens and rejects everything else', () => {
		expect(normalizeNumberFormat('{YYYY}-{EMPLOYEE}-{SEQ}')).to.equal('{YYYY}-{EMPLOYEE}-{SEQ}');
		expect(normalizeNumberFormat('{YYYY}-{SEQ}')).to.equal('{YYYY}-{SEQ}');
		expect(normalizeNumberFormat('RE-{SEQ}')).to.equal('RE-{SEQ}');
		// {SEQ} must appear exactly once, otherwise the series breaks
		expect(normalizeNumberFormat('{YYYY}-{EMPLOYEE}')).to.equal(null);
		expect(normalizeNumberFormat('{SEQ}-{SEQ}')).to.equal(null);
		// unknown tokens and unsafe separators are refused
		expect(normalizeNumberFormat('{YEAR}-{SEQ}')).to.equal(null);
		expect(normalizeNumberFormat('{SEQ}/../{SEQ}')).to.equal(null);
		expect(normalizeNumberFormat('{SEQ }')).to.equal(null);
		expect(normalizeNumberFormat('  {SEQ}  ')).to.equal('{SEQ}');
		expect(normalizeNumberFormat('')).to.equal(null);
		expect(normalizeNumberFormat(undefined)).to.equal(null);
	});

	it('renders a custom format and pads the sequence', () => {
		expect(renderInvoiceNumber('{YYYY}-{EMPLOYEE}-{SEQ}', { year: 2026, employee: '01', seq: 1 })).to.equal(
			'2026-01-001',
		);
		expect(renderInvoiceNumber('{YYYY}-{SEQ}', { year: 2026, employee: '01', seq: 42 })).to.equal('2026-042');
		expect(renderInvoiceNumber('RE-{SEQ}', { year: 2026, employee: '1', seq: 7 })).to.equal('RE-007');
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

	it('rejects a delivery period with an impossible or reversed range', () => {
		expect(parseDeliveryPeriod('2026-10-01..2026-10-31')).to.deep.equal({
			start: '2026-10-01',
			end: '2026-10-31',
		});
		expect(parseDeliveryPeriod('2026-10-01')).to.deep.equal({ start: '2026-10-01', end: null });
		expect(parseDeliveryPeriod('2026-10-31..2026-10-01')).to.equal(null);
		expect(parseDeliveryPeriod('2026-10-01..2026-02-31')).to.equal(null);
		expect(parseDeliveryPeriod('irgendwann')).to.equal(null);
		expect(formatDeliveryDateDe('2026-10-01..2026-10-31')).to.equal('01.10.2026 – 31.10.2026');
		expect(formatDeliveryDateDe('2026-10-01')).to.equal('01.10.2026');
	});

	it('accepts a delivery period but rejects free text', () => {
		const period = validDraft();
		period.deliveryDate = '2026-10-01..2026-10-31';
		expect(validateInvoiceForIssue(period)).to.deep.equal([]);
		const free = validDraft();
		free.deliveryDate = '03.10.2026';
		expect(validateInvoiceForIssue(free).join(' ')).to.contain('Delivery/service date');
	});

	it('calculates the cash discount from the gross total', () => {
		const none = calcSkonto(647.36, 0, undefined, '2026-10-12');
		expect(none.amount).to.equal(0);
		expect(none.payableNow).to.equal(647.36);

		const two = calcSkonto(647.36, 2, undefined, '2026-10-12');
		expect(two.percent).to.equal(2);
		expect(two.amount).to.equal(12.95);
		expect(two.payableNow).to.equal(634.41);
		expect(two.dueDate).to.equal('2026-10-12');

		const own = calcSkonto(647.36, 2, '2026-10-01', '2026-10-12');
		expect(own.dueDate).to.equal('2026-10-01');
	});

	it('validates the skonto deadline', () => {
		const base = validDraft();
		base.issueDate = '2026-09-28';
		base.dueDate = '2026-10-12';
		expect(validateInvoiceForIssue({ ...base, skontoPercent: 2 })).to.deep.equal([]);
		expect(validateInvoiceForIssue({ ...base, skontoPercent: 2, skontoDueDate: '2026-10-12' })).to.deep.equal([]);
		expect(
			validateInvoiceForIssue({ ...base, skontoPercent: 2, skontoDueDate: '2026-09-01' }).join(' '),
		).to.contain('not be before the issue date');
		expect(
			validateInvoiceForIssue({ ...base, skontoPercent: 2, skontoDueDate: '2026-11-01' }).join(' '),
		).to.contain('not be later than the due date');
		expect(validateInvoiceForIssue({ ...base, skontoPercent: 2, dueDate: '' }).join(' ')).to.contain('deadline');
		expect(validateInvoiceForIssue({ ...base, skontoPercent: 120 }).join(' ')).to.contain('between 0 and 100');
		expect(validateInvoiceForIssue({ ...base, skontoPercent: Number.NaN }).join(' ')).to.contain(
			'between 0 and 100',
		);
	});

	it('rejects a delivery period instead of truncating it silently', () => {
		const draft = validDraft();
		draft.deliveryDate = '2026-10-01..2026-09-30';
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

describe('invoice-model => document type and quotation lifecycle (R8)', () => {
	it('normalises the document type and guards the e-invoice path', () => {
		expect(normalizeDocumentType(undefined)).to.equal('invoice');
		expect(normalizeDocumentType(null)).to.equal('invoice');
		expect(normalizeDocumentType('  QUOTE ')).to.equal('quote');
		expect(normalizeDocumentType('Auftrag')).to.equal('invoice');
		expect(DOCUMENT_TYPES).to.deep.equal(['invoice', 'quote']);
		expect(isQuote('quote')).to.equal(true);
		expect(isQuote('Rechnung')).to.equal(false);
		expect(defaultDocumentTitle('quote')).to.equal('Angebot');
		expect(defaultDocumentTitle()).to.equal('Rechnung');
		expect(QUOTE_TITLES).to.contain('Angebot');
		expect(INVOICE_TITLES).to.not.contain('Angebot');
	});

	it('gives a quotation 30 days of validity by default', () => {
		expect(QUOTE_VALIDITY_DAYS).to.equal(30);
		expect(defaultValidUntil('2026-09-28')).to.equal('2026-10-28');
		// UTC arithmetic: no drift at the year boundary
		expect(defaultValidUntil('2025-12-31')).to.equal('2026-01-30');
		expect(addDaysIso('2026-01-31', 31)).to.equal('2026-03-03');
		// a value that is no date is handed back untouched
		expect(addDaysIso('28.09.2026', 30)).to.equal('28.09.2026');
	});

	it('derives the state of a quotation from its dates', () => {
		const base: QuoteLifecycle = { status: 'issued', validUntil: '2026-10-28', acceptedAt: null, rejectedAt: null };
		expect(quoteState({ ...base, status: 'draft' }, '2026-10-01')).to.equal('draft');
		// the last day of validity is still open, "verfallen" starts the day after
		expect(quoteState(base, '2026-10-28')).to.equal('open');
		expect(quoteState(base, '2026-10-29')).to.equal('expired');
		// an open-ended offer and a broken date never expire
		expect(quoteState({ ...base, validUntil: null }, '2027-01-01')).to.equal('open');
		expect(quoteState({ ...base, validUntil: 'nope' }, '2027-01-01')).to.equal('open');
		// a discarded quotation is off the table for good
		expect(quoteState({ ...base, status: 'cancelled' }, '2026-10-01')).to.equal('rejected');
		// the decision beats every date, an accepted offer never expires
		expect(quoteState({ ...base, acceptedAt: '2026-10-02T09:00:00.000Z' }, '2027-01-01')).to.equal('accepted');
		expect(quoteState({ ...base, rejectedAt: '2026-10-02T09:00:00.000Z' }, '2026-10-01')).to.equal('rejected');
	});

	it('labels the quotation states in German', () => {
		expect(quoteStateLabel('draft')).to.equal('Entwurf');
		expect(quoteStateLabel('open')).to.equal('Offen');
		expect(quoteStateLabel('accepted')).to.equal('Angenommen');
		expect(quoteStateLabel('rejected')).to.equal('Abgelehnt');
		expect(quoteStateLabel('expired')).to.equal('Verfallen');
	});

	it('writes a plain sight PDF for a quotation and says so', () => {
		const quote = documentLabels('quote');
		expect(quote.number).to.equal('Angebotsnr.:');
		expect(quote.date).to.equal('Angebotsdatum:');
		expect(quote.delivery).to.equal('Leistungszeitraum:');
		expect(quote.validUntil).to.equal('Gültig bis:');
		expect(quote.perDocument).to.equal('je Angebot');
		expect(quote.subject).to.contain('ohne E-Rechnungs-XML');
		// the e-invoice keeps the EN 16931 wording
		const invoice = documentLabels();
		expect(invoice.number).to.equal('Rechnungsnr.:');
		expect(invoice.perDocument).to.equal('je Rechnung');
		expect(invoice.subject).to.contain('ZUGFeRD');
	});

	it('starts a blank quotation with its own title and validity', () => {
		const quote = blankDraft('2026-09-28', 'quote');
		expect(quote.docType).to.equal('quote');
		expect(quote.documentTitle).to.equal('Angebot');
		expect(quote.validUntil).to.equal('2026-10-28');
		const invoice = blankDraft('2026-09-28');
		expect(invoice.docType).to.equal('invoice');
		expect(invoice.documentTitle).to.equal('Rechnung');
		expect(invoice.validUntil).to.equal(undefined);
	});

	it('validates a quotation without BT-10 and without Skonto', () => {
		const quote: InvoiceDraftInput = { ...validDraft(), docType: 'quote', documentTitle: 'Angebot' };
		quote.buyer = { ...buyer, customerNumber: undefined };
		expect(validateInvoiceForIssue(quote)).to.deep.equal([]);

		// the invoice counterpart fails on the missing customer number
		const invoice = validDraft();
		invoice.buyer = { ...buyer, customerNumber: undefined };
		expect(validateInvoiceForIssue(invoice).join(' ')).to.contain('customer number');

		// the validity date is a real date and never before the issue date
		expect(validateInvoiceForIssue({ ...quote, validUntil: '31.10.2026' }).join(' ')).to.contain('Valid-until');
		expect(validateInvoiceForIssue({ ...quote, validUntil: '2026-09-01' }).join(' ')).to.contain('not be before');
	});
});
