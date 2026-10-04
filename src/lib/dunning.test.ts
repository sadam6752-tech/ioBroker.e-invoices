/**
 * R6.4: dunning. The levels, the days they start on, the texts with their placeholders,
 * the collective letter as PDF and CSV. Nothing here may create an XML or send anything.
 */
import { expect } from 'chai';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { renderDunningCsv } from './csv';
import { InvoiceDatabase } from './db';
import { buildDunningSuggestions, fillPlaceholders } from './dunning';
import { renderDunningPdf } from './dunning-pdf';
import { collectReminderCandidates } from './issue-service';
import type { InvoiceDraftInput, Party } from './invoice-model';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';

const seller: Party = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
};
const buyer: Party = {
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
	email: 'kunde@example.com',
};

/**
 * An issued invoice that fell due on `dueDate`.
 *
 * @param db - Database.
 * @param dueDate - ISO due date.
 * @param overrides - Fields to change.
 */
function issued(db: InvoiceDatabase, dueDate: string, overrides: Partial<InvoiceDraftInput> = {}): string {
	const draft = db.createDraft({
		seller,
		buyer,
		lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-07-01',
		deliveryDate: '2026-07-01',
		dueDate,
		currency: 'EUR',
		...overrides,
	});
	return db.issueDraft(draft.id).id;
}

/**
 * Suggestions for a day.
 *
 * @param db - Database.
 * @param today - ISO day.
 */
function suggestions(db: InvoiceDatabase, today: string): ReturnType<typeof buildDunningSuggestions> {
	return buildDunningSuggestions(collectReminderCandidates(db, today), db.listDunningTexts(), today);
}

describe('dunning => suggestions (R6.4)', () => {
	it('suggests the level whose day has come and nothing before', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const id = issued(db, '2026-08-01');
			// 4 days overdue: below the first level (5 days)
			expect(suggestions(db, '2026-08-05')).to.have.length(0);
			// 5 days: the reminder, with the number and amount in the text
			const first = suggestions(db, '2026-08-06');
			expect(first).to.have.length(1);
			expect(first[0]).to.include({ invoiceId: id, level: 1, overdueDays: 5, email: 'kunde@example.com' });
			expect(first[0].subject).to.equal(`Zahlungserinnerung zur Rechnung ${first[0].number}`);
			expect(first[0].text).to.contain('119,00 €').and.to.contain('01.07.2026').and.to.contain('01.08.2026');
			expect(first[0].text).to.not.match(/\{\w+\}/);
			expect(first[0].deadline).to.equal('2026-08-13');
			expect(first[0].recipient).to.deep.equal(['Kunde AG', 'Kundenweg 5', '80331 München']);
		} finally {
			db.close();
		}
	});

	it('moves on level by level and stops after the last one, never twice on a day', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const id = issued(db, '2026-08-01');
			db.registerReminder(id, '2026-08-06'); // level 1 marked
			// the same day nothing is suggested again
			expect(suggestions(db, '2026-08-06')).to.have.length(0);
			// day 18 overdue: level 2 only starts at 19
			expect(suggestions(db, '2026-08-19')).to.have.length(0);
			const second = suggestions(db, '2026-08-20');
			expect(second[0]).to.include({ level: 2, overdueDays: 19 });
			expect(second[0].subject).to.contain('1. Mahnung');
			db.registerReminder(id, '2026-08-20');
			expect(suggestions(db, '2026-09-04')[0]).to.include({ level: 3 });
			db.registerReminder(id, '2026-09-04');
			// after the last level there is no template for a next step
			expect(suggestions(db, '2026-10-30')).to.have.length(0);
		} finally {
			db.close();
		}
	});

	it('leaves out paid invoices, offers and invoices that were reversed, and mentions an open Skonto', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const paid = issued(db, '2026-08-01');
			db.setPaid(paid, true);
			const reversed = issued(db, '2026-08-01');
			db.issueDraft(db.reverseInvoice(reversed).reversal.id);
			issued(db, '2026-08-01', { docType: 'quote' });
			const skonto = issued(db, '2026-08-01', { skontoPercent: 2, skontoDueDate: '2026-08-31' });
			const found = suggestions(db, '2026-08-10');
			expect(found.map(item => item.invoiceId)).to.deep.equal([skonto]);
			expect(found[0].skontoActive).to.equal(true);
			expect(found[0].text).to.contain('2 % Skonto');
		} finally {
			db.close();
		}
	});

	it('fills placeholders and leaves unknown ones as typed', () => {
		expect(fillPlaceholders('{number} {nope}', { number: 'R-1' })).to.equal('R-1 {nope}');
	});
});

describe('dunning => texts (R6.4)', () => {
	it('starts with the built-in texts, saves a change per level and takes it back', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			expect(db.listDunningTexts().map(t => [t.level, t.days, t.isDefault])).to.deep.equal([
				[1, 5, true],
				[2, 19, true],
				[3, 33, true],
			]);
			const changed = db.saveDunningText(1, { subject: 'Erinnerung {number}', days: 3, deadlineDays: 10 });
			expect(changed[0]).to.include({
				subject: 'Erinnerung {number}',
				days: 3,
				deadlineDays: 10,
				isDefault: false,
			});
			expect(changed[1].isDefault).to.equal(true);
			// the new day applies to the suggestions
			const id = issued(db, '2026-08-01');
			expect(suggestions(db, '2026-08-04').map(s => s.invoiceId)).to.deep.equal([id]);
			expect(db.resetDunningText(1)[0]).to.include({ days: 5, isDefault: true });
		} finally {
			db.close();
		}
	});

	it('refuses wrong values and days that do not rise from level to level', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			expect(() => db.saveDunningText(4, { subject: 'x' })).to.throw(/Level must be/);
			expect(() => db.saveDunningText(1, { subject: '' })).to.throw(/subject/);
			expect(() => db.saveDunningText(1, { days: 0 })).to.throw(/days/);
			expect(() => db.saveDunningText(1, { deadlineDays: 'bald' })).to.throw(/deadlineDays/);
			expect(() => db.saveDunningText(1, { body: 'x'.repeat(4001) })).to.throw(/body/);
			// level 1 may not start after level 2, level 2 not before level 1
			expect(() => db.saveDunningText(1, { days: 19 })).to.throw(/rise/);
			expect(() => db.saveDunningText(2, { days: 5 })).to.throw(/rise/);
			expect(() => db.resetDunningText(0)).to.throw(/level/);
		} finally {
			db.close();
		}
	});

	it('travels with the backup data', () => {
		const from = new InvoiceDatabase(':memory:');
		from.migrate();
		const to = new InvoiceDatabase(':memory:');
		to.migrate();
		try {
			from.saveDunningText(2, { subject: 'Mahnung {number}' });
			to.saveDunningText(3, { subject: 'wird ersetzt' });
			to.importData(from.exportData());
			expect(to.listDunningTexts()[1]).to.include({ subject: 'Mahnung {number}', isDefault: false });
			expect(to.listDunningTexts()[2].isDefault).to.equal(true);
			// a dump from before R6.4 keeps what is stored
			const old = from.exportData();
			delete old.dunningTexts;
			to.importData(old);
			expect(to.listDunningTexts()[1].isDefault).to.equal(false);
		} finally {
			from.close();
			to.close();
		}
	});

	it('upgrades a v14 database without touching its invoices', () => {
		const dir = mkdtempSync(join(tmpdir(), 'einv-legacy-'));
		const file = join(dir, 'invoices.db');
		const legacy = new Database(file);
		try {
			for (const migration of MIGRATIONS.filter(m => m.version <= 14)) {
				for (const statement of migration.sql) {
					legacy.exec(statement);
				}
				legacy
					.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`)
					.run(migration.version, migration.name, '2026-01-01T00:00:00.000Z');
			}
		} finally {
			legacy.close();
		}
		const db = new InvoiceDatabase(file);
		try {
			db.migrate();
			expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
			expect(db.storedDunningTexts()).to.deep.equal([]);
			expect(db.listDunningTexts()).to.have.length(3);
		} finally {
			db.close();
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('dunning => letters and list (R6.4)', function () {
	this.timeout(60000);

	it('prints one page per suggestion and the CSV sums equal the list', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			issued(db, '2026-08-01');
			issued(db, '2026-07-20', {
				lines: [{ description: 'Mehr', quantity: 2, unit: 'Stk', unitPriceNet: 50, vatRate: 19 }],
			});
			issued(db, '2026-08-01', { buyer: { ...buyer, name: 'Dritter GmbH' } });
			const today = '2026-08-12';
			const found = suggestions(db, today);
			expect(found).to.have.length(3);

			const pdf = await renderDunningPdf(found, today);
			expect(pdf.subarray(0, 4).toString()).to.equal('%PDF');
			const loaded = await PDFDocument.load(pdf);
			expect(loaded.getPageCount()).to.equal(3);
			// a reminder is a letter, not an e-invoice: no XML travels in it
			expect(pdf.toString('latin1')).to.not.contain('CrossIndustryInvoice');
			expect(pdf.toString('latin1')).to.not.contain('EmbeddedFile');

			const csv = renderDunningCsv(found, today);
			const rows = csv.split('\r\n').filter(line => /^"?20\d\d-/.test(line) || line.startsWith('2026'));
			expect(rows).to.have.length(3);
			const total = found.reduce((sum, item) => sum + item.amount, 0);
			expect(csv).to.contain(`Summe;3;${(Math.round(total * 100) / 100).toFixed(2).replace('.', ',')}`);
			// nothing was created or changed by looking
			expect(db.listInvoices({ status: 'issued' }).every(invoice => invoice.reminderLevel === 0)).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('writes an empty list as a letter that says so', async () => {
		const pdf = await renderDunningPdf([], '2026-08-12');
		expect((await PDFDocument.load(pdf)).getPageCount()).to.equal(1);
	});
});
