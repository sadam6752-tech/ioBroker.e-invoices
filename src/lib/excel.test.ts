/**
 * P4d tests: Excel single-sheet and list exports (read back via exceljs).
 */
import ExcelJS from 'exceljs';
import { expect } from 'chai';
import { InvoiceDatabase, type StoredInvoice } from './db';
import { EXCEL_COPY_NOTICE, renderInvoiceListWorkbook, renderInvoiceWorkbook } from './excel';

function issueSample(): { db: InvoiceDatabase; invoice: StoredInvoice } {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	const created = db.createDraft({
		seller: { name: 'Muster GmbH', street: 'B 1', zip: '10115', city: 'Berlin', country: 'DE', vatId: 'DE1' },
		buyer: { name: 'Kunde AG', street: 'K 5', zip: '80331', city: 'München', country: 'DE' },
		lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		currency: 'EUR',
	});
	return { db, invoice: db.issueDraft(created.id) };
}

function sheetText(sheet: ExcelJS.Worksheet): string {
	const parts: string[] = [];
	sheet.eachRow(row => {
		row.eachCell(cell => {
			const value = cell.value;
			parts.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? ''));
		});
	});
	return parts.join(' | ');
}

describe('excel => single invoice', () => {
	it('renders a readable copy with notice and totals', async () => {
		const { db, invoice } = issueSample();
		try {
			const buffer = await renderInvoiceWorkbook(invoice);
			expect(buffer.subarray(0, 2).toString()).to.equal('PK');

			const book = new ExcelJS.Workbook();
			await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0]);
			const sheet = book.getWorksheet('Rechnung');
			expect(sheet, 'sheet Rechnung').to.not.equal(undefined);
			const text = sheetText(sheet!);
			expect(text).to.contain(invoice.number ?? 'NUMBER-MISSING');
			expect(text).to.contain(EXCEL_COPY_NOTICE);
			expect(text).to.contain('Muster GmbH');
			expect(text).to.contain('Kunde AG');
			expect(text).to.contain('238');
		} finally {
			db.close();
		}
	});

	it('refuses invoices without number', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const draft = db.createDraft({
				seller: { name: 'S', street: 'a', zip: '1', city: 'B', country: 'DE', vatId: 'DE1' },
				buyer: { name: 'K', street: 'a', zip: '1', city: 'B', country: 'DE' },
				lines: [],
				issueDate: '2026-09-28',
				deliveryDate: '2026-09-28',
				currency: 'EUR',
			});
			await renderInvoiceWorkbook(draft).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.contain('no number');
				},
			);
		} finally {
			db.close();
		}
	});
});

describe('excel => list export', () => {
	it('lists all invoices with sums', async () => {
		const { db, invoice } = issueSample();
		try {
			const buffer = await renderInvoiceListWorkbook(db.listInvoices(), 'Testübersicht');
			const book = new ExcelJS.Workbook();
			await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0]);
			const sheet = book.getWorksheet('Übersicht');
			const text = sheetText(sheet!);
			expect(text).to.contain(invoice.number ?? 'NUMBER-MISSING');
			expect(text).to.contain('Kunde AG');
			expect(text).to.contain(EXCEL_COPY_NOTICE);
		} finally {
			db.close();
		}
	});
});
