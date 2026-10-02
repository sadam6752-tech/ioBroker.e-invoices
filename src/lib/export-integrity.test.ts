/**
 * R5.1 tests: the Excel copy carries the same amounts as the stored record and
 * as the leading XML.
 *
 * The workbook is a *copy* (see `EXCEL_COPY_NOTICE`); the DoD line "Excel
 * summenidentisch zum XML" is only true if net, VAT and gross per rate agree
 * with `invoice.totals` and with BT-109 / BT-110 / BT-112 and the per-rate tax
 * breakdown (BT-116 / BT-117 / BT-119) of the CII document. The tests read the
 * cells back with exceljs and the amounts out of the XML — no text matching.
 */
import ExcelJS from 'exceljs';
import { expect } from 'chai';
import { InvoiceDatabase, type StoredInvoice } from './db';
import { renderInvoiceListWorkbook, renderInvoiceWorkbook } from './excel';
import { calcTotals, type InvoiceDraftInput } from './invoice-model';
import { generateInvoiceXml } from './zugferd';

const seller = {
	name: 'Muster GmbH',
	street: 'B 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};
const buyer = {
	name: 'Kunde AG',
	street: 'K 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
};

/** Two VAT rates, a line discount and awkward cents: the cases where copies drift apart. */
const multiRate: InvoiceDraftInput = {
	seller,
	buyer,
	lines: [
		{ description: 'Beratung', quantity: 3, unit: 'Std', unitPriceNet: 33.33, vatRate: 19, discountPercent: 10 },
		{ description: 'Material', quantity: 7, unit: 'Stk', unitPriceNet: 12.34, vatRate: 7 },
		{ description: 'Anfahrt', quantity: 1, unit: 'Stk', unitPriceNet: 0.1, vatRate: 19 },
	],
	issueDate: '2026-09-28',
	deliveryDate: '2026-09-27',
	currency: 'EUR',
};

/** A plain second invoice for the list export. */
const simple: InvoiceDraftInput = {
	seller,
	buyer: { ...buyer, name: 'Zweiter Kunde GmbH', customerNumber: 'K-43' },
	lines: [{ description: 'Pauschale', quantity: 1, unit: 'Stk', unitPriceNet: 250, vatRate: 19 }],
	issueDate: '2026-09-29',
	deliveryDate: '2026-09-29',
	currency: 'EUR',
};

/**
 * Amount in the first element with this tag inside a block of XML.
 *
 * @param xml - Block of XML to search.
 * @param tag - Qualified tag name, e.g. `ram:GrandTotalAmount`.
 */
function amountIn(xml: string, tag: string): number {
	const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]+)</${tag}>`).exec(xml);
	if (!match) {
		throw new Error(`${tag} not found in the XML`);
	}
	return Number(match[1]);
}

/** One per-rate block of the XML tax breakdown (BG-23). */
interface XmlTaxBlock {
	rate: number;
	basis: number;
	tax: number;
}

/**
 * The per-rate tax blocks of the document summation (BG-23).
 *
 * @param xml - CII document.
 */
function xmlBreakdown(xml: string): XmlTaxBlock[] {
	const settlement =
		/<ram:ApplicableHeaderTradeSettlement>[\s\S]*<\/ram:ApplicableHeaderTradeSettlement>/.exec(xml)?.[0] ?? '';
	const blocks = [...settlement.matchAll(/<ram:ApplicableTradeTax>([\s\S]*?)<\/ram:ApplicableTradeTax>/g)].map(
		m => m[1],
	);
	return blocks
		.filter(block => block.includes('<ram:CalculatedAmount>'))
		.map(block => ({
			rate: amountIn(block, 'ram:RateApplicablePercent'),
			basis: amountIn(block, 'ram:BasisAmount'),
			tax: amountIn(block, 'ram:CalculatedAmount'),
		}))
		.sort((a, b) => a.rate - b.rate);
}

/**
 * Numeric value of the cell in a column of the row whose first cell matches.
 *
 * @param sheet - Worksheet to search.
 * @param label - Pattern for the label in column A.
 * @param column - Column holding the amount.
 */
function amountOfRow(sheet: ExcelJS.Worksheet, label: RegExp, column: number): number {
	let found: number | undefined;
	sheet.eachRow(row => {
		const first = row.getCell(1).value;
		if (found === undefined && typeof first === 'string' && label.test(first)) {
			found = Number(row.getCell(column).value);
		}
	});
	if (found === undefined) {
		throw new Error(`no row matches ${String(label)}`);
	}
	return found;
}

/**
 * Loads a workbook buffer.
 *
 * @param buffer - xlsx bytes.
 */
async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
	const book = new ExcelJS.Workbook();
	await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0]);
	return book;
}

/**
 * Issues a draft and returns the stored record.
 *
 * @param db - Open database.
 * @param input - Draft content.
 */
function issue(db: InvoiceDatabase, input: InvoiceDraftInput): StoredInvoice {
	return db.issueDraft(db.createDraft(input).id);
}

describe('export integrity => Excel copy equals record and XML (R5.1)', function () {
	this.timeout(60000);

	it('carries the amounts of the record and of the XML in the single-invoice sheet', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const invoice = issue(db, multiRate);
			const stored = invoice.totals;
			// the record itself is the recomputation of its lines, no stale snapshot
			expect(stored).to.deep.equal(calcTotals(invoice.lines));
			expect(stored.breakdown.length, 'two rates in the fixture').to.equal(2);

			const { xml } = await generateInvoiceXml(invoice);
			const sheet = (await load(await renderInvoiceWorkbook(invoice))).getWorksheet('Rechnung')!;

			// totals: sheet == record == XML (BT-109 net, BT-110 VAT, BT-112 gross)
			const sheetNet = amountOfRow(sheet, /^Gesamt netto$/, 5);
			const sheetGross = amountOfRow(sheet, /^Rechnungsbetrag$/, 5);
			expect(sheetNet).to.equal(stored.netTotal);
			expect(sheetGross).to.equal(stored.grossTotal);
			expect(amountIn(xml, 'ram:TaxBasisTotalAmount')).to.equal(stored.netTotal);
			expect(amountIn(xml, 'ram:GrandTotalAmount')).to.equal(stored.grossTotal);
			const xmlTax = amountIn(xml, 'ram:TaxTotalAmount');
			expect(xmlTax).to.equal(stored.taxTotal);
			expect(Math.round((sheetGross - sheetNet) * 100) / 100, 'gross - net is the VAT').to.equal(xmlTax);

			// per rate: the sheet shows the VAT of the rate, the XML net basis and VAT
			const blocks = xmlBreakdown(xml);
			expect(blocks.map(b => b.rate)).to.deep.equal(stored.breakdown.map(b => b.vatRate).sort((a, b) => a - b));
			for (const entry of stored.breakdown) {
				const block = blocks.find(b => b.rate === entry.vatRate)!;
				expect(block.basis, `net basis at ${entry.vatRate} %`).to.equal(entry.net);
				expect(block.tax, `VAT at ${entry.vatRate} %`).to.equal(entry.tax);
				expect(amountOfRow(sheet, new RegExp(`^Netto ${entry.vatRate} % / USt$`), 5)).to.equal(entry.tax);
			}
			// and the blocks add up to the totals (BR-CO-13 / BR-CO-15)
			const basisSum = Math.round(blocks.reduce((sum, b) => sum + b.basis, 0) * 100) / 100;
			const taxSum = Math.round(blocks.reduce((sum, b) => sum + b.tax, 0) * 100) / 100;
			expect(basisSum).to.equal(stored.netTotal);
			expect(taxSum).to.equal(stored.taxTotal);
		} finally {
			db.close();
		}
	});

	it('shows the line amounts of the sheet as the net amounts of the XML lines', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const invoice = issue(db, multiRate);
			const { xml } = await generateInvoiceXml(invoice);
			const sheet = (await load(await renderInvoiceWorkbook(invoice))).getWorksheet('Rechnung')!;

			const sheetLines: number[] = [];
			sheet.eachRow(row => {
				const description = row.getCell(1).value;
				if (invoice.lines.some(l => l.description === description)) {
					sheetLines.push(Number(row.getCell(5).value));
				}
			});
			const xmlLines = [
				...xml.matchAll(/<ram:SpecifiedTradeSettlementLineMonetarySummation>\s*<ram:LineTotalAmount>([^<]+)</g),
			].map(m => Number(m[1]));
			expect(sheetLines).to.have.lengthOf(invoice.lines.length);
			expect(xmlLines).to.have.lengthOf(invoice.lines.length);
			expect(sheetLines).to.deep.equal(xmlLines);
			// and the lines add up to BT-106 / BT-109 (no rounding drift between copy and original)
			const header =
				/<ram:SpecifiedTradeSettlementHeaderMonetarySummation>[\s\S]*?<\/ram:SpecifiedTradeSettlementHeaderMonetarySummation>/.exec(
					xml,
				)![0];
			const lineSum = Math.round(xmlLines.reduce((a, b) => a + b, 0) * 100) / 100;
			expect(amountIn(header, 'ram:LineTotalAmount')).to.equal(lineSum);
			expect(lineSum).to.equal(invoice.totals.netTotal);
		} finally {
			db.close();
		}
	});

	it('carries record and XML amounts per invoice in the list sheet', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const first = issue(db, multiRate);
			const second = issue(db, simple);
			const sheet = (await load(await renderInvoiceListWorkbook(db.listInvoices(), 'Übersicht'))).getWorksheet(
				'Übersicht',
			)!;

			const rows = new Map<string, { net: number; tax: number; gross: number }>();
			sheet.eachRow(row => {
				const number = row.getCell(1).value;
				if (number === first.number || number === second.number) {
					rows.set(String(number), {
						net: Number(row.getCell(4).value),
						tax: Number(row.getCell(5).value),
						gross: Number(row.getCell(6).value),
					});
				}
			});
			expect(rows.size).to.equal(2);

			for (const invoice of [first, second]) {
				const { xml } = await generateInvoiceXml(invoice);
				const row = rows.get(String(invoice.number))!;
				expect(row, `${String(invoice.number)} in the sheet`).to.deep.equal({
					net: invoice.totals.netTotal,
					tax: invoice.totals.taxTotal,
					gross: invoice.totals.grossTotal,
				});
				expect(row.net).to.equal(amountIn(xml, 'ram:TaxBasisTotalAmount'));
				expect(row.tax).to.equal(amountIn(xml, 'ram:TaxTotalAmount'));
				expect(row.gross).to.equal(amountIn(xml, 'ram:GrandTotalAmount'));
			}
		} finally {
			db.close();
		}
	});
});
