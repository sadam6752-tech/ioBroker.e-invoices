/**
 * R7.5: the whole migration chain. Every released schema version has to reach the
 * latest one, and no step may touch what is already stored: the invoice numbers and
 * the number circles come out exactly as they went in. Running `migrate()` twice is a no-op.
 */
import { expect } from 'chai';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InvoiceDatabase } from './db';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';

/**
 * Applies the migrations up to `version` to a fresh database file, like an adapter of that
 * time would have left it, with one issued invoice and its counter.
 *
 * @param file - Database path.
 * @param version - Last version to apply.
 */
function legacyDatabase(file: string, version: number): void {
	const legacy = new Database(file);
	try {
		for (const migration of MIGRATIONS.filter(m => m.version <= version)) {
			for (const statement of migration.sql) {
				legacy.exec(statement);
			}
			legacy
				.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`)
				.run(migration.version, migration.name, '2026-01-01T00:00:00.000Z');
		}
		legacy
			.prepare(
				`INSERT INTO invoices
				 (id, number, issue_date, delivery_date, seller_json, buyer_json, lines_json, totals_json, status, created_at, updated_at)
				 VALUES ('legacy', '2026-00-005', '2026-01-05', '2026-01-04', '{}', '{}', '[]', '{"netTotal":10,"taxTotal":1.9,"grossTotal":11.9,"breakdown":[]}', 'issued', '2026-01-05T08:00:00.000Z', '2026-01-05T08:00:00.000Z')`,
			)
			.run();
		// the counter looks different before v3 (no employee) and before v12 (no document type)
		if (version < 3) {
			legacy.prepare(`INSERT INTO counters (year, last_seq) VALUES (2026, 5)`).run();
		} else if (version < 12) {
			legacy.prepare(`INSERT INTO counters (year, employee, last_seq) VALUES (2026, '00', 5)`).run();
		} else {
			legacy
				.prepare(`INSERT INTO counters (year, employee, doc_type, last_seq) VALUES (2026, '00', 'invoice', 5)`)
				.run();
		}
	} finally {
		legacy.close();
	}
}

describe('migrations => the whole chain (R7.5)', () => {
	it('numbers the versions without gaps and ends at the latest', () => {
		expect(MIGRATIONS.map(m => m.version)).to.deep.equal(MIGRATIONS.map((_m, index) => index + 1));
		expect(LATEST_SCHEMA_VERSION).to.equal(MIGRATIONS.length);
	});

	for (let from = 1; from < MIGRATIONS.length; from++) {
		it(`upgrades a v${from} database, keeps number and counter and is a no-op the second time`, () => {
			const dir = mkdtempSync(join(tmpdir(), 'einv-chain-'));
			const file = join(dir, 'invoices.db');
			legacyDatabase(file, from);
			const db = new InvoiceDatabase(file);
			try {
				db.migrate();
				expect(db.currentVersion()).to.equal(LATEST_SCHEMA_VERSION);
				const kept = db.getInvoice('legacy');
				expect(kept?.number).to.equal('2026-00-005');
				expect(kept?.status).to.equal('issued');
				// what the new columns say about an old document
				expect(kept?.docType).to.equal('invoice');
				expect(kept?.templateSnapshot).to.equal(null);
				expect(kept?.companyId).to.equal(null);
				// the circle continues where it was
				expect(db.nextInvoiceNumber(2026)).to.equal('2026-00-006');
				const version = db.currentVersion();
				db.migrate();
				expect(db.currentVersion()).to.equal(version);
				// the three tables of the later versions are there and usable
				expect(db.listDunningTexts()).to.have.length(3);
				expect(db.listRenderHistory('legacy')).to.deep.equal([]);
			} finally {
				db.close();
				rmSync(dir, { recursive: true, force: true });
			}
		});
	}
});
