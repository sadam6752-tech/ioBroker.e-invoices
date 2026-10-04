/**
 * 0.9.2: the automatic backup is on by default, keeps the last N automatic backups and warns when
 * the newest backup is missing or old. The database is only in an ioBroker (BackItUp) backup through
 * the adapter ZIP, so these rules decide whether a restore has anything to restore.
 */
import { expect } from 'chai';
import {
	AUTO_BACKUP_PREFIX,
	backupStatus,
	createBackup,
	MANUAL_BACKUP_PREFIX,
	nextBackupDelayMs,
	selectBackupsToPrune,
} from './backup';
import { InvoiceDatabase } from './db';

const HOUR = 3_600_000;
const quiet = { info: (): void => undefined, error: (): void => undefined };

/**
 * A backup log entry.
 *
 * @param name - Name without folder and extension.
 * @param createdAt - ISO time.
 */
function entry(name: string, createdAt: string): { filename: string; createdAt: string } {
	return { filename: `backups/${name}.zip`, createdAt };
}

describe('backup schedule (0.9.2)', () => {
	it('names automatic and manual backups differently', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const read = (): Promise<Buffer> => Promise.reject(new Error('no files'));
			expect((await createBackup(db, { read }, quiet, 'x')).filename.startsWith(MANUAL_BACKUP_PREFIX)).to.equal(
				true,
			);
			expect(
				(await createBackup(db, { read }, quiet, 'x', 'auto')).filename.startsWith(AUTO_BACKUP_PREFIX),
			).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('prunes only the oldest automatic backups beyond the number to keep', () => {
		const log = [
			entry('e-invoices-auto-1', '2026-10-01T03:00:00.000Z'),
			entry('e-invoices-auto-2', '2026-10-02T03:00:00.000Z'),
			entry('e-invoices-auto-3', '2026-10-03T03:00:00.000Z'),
			entry('e-invoices-auto-4', '2026-10-04T03:00:00.000Z'),
			// never touched: made by hand and the safety backup before a restore
			entry('e-invoices-backup-0', '2026-09-01T03:00:00.000Z'),
			entry('e-invoices-prerestore-0', '2026-09-02T03:00:00.000Z'),
		];
		expect(selectBackupsToPrune(log, 2)).to.deep.equal([
			'backups/e-invoices-auto-2.zip',
			'backups/e-invoices-auto-1.zip',
		]);
		expect(selectBackupsToPrune(log, 4)).to.deep.equal([]);
		expect(selectBackupsToPrune(log, 10)).to.deep.equal([]);
		// 0 keeps everything
		expect(selectBackupsToPrune(log, 0)).to.deep.equal([]);
		expect(selectBackupsToPrune(log, Number.NaN)).to.deep.equal([]);
	});

	it('counts the interval from the last automatic backup, so a restart neither skips nor repeats one', () => {
		const now = Date.parse('2026-10-04T12:00:00.000Z');
		const day = 24 * HOUR;
		// none yet: a minute after the start
		expect(nextBackupDelayMs(null, day, now)).to.equal(60_000);
		// done 2 h ago: due in 22 h
		expect(nextBackupDelayMs('2026-10-04T10:00:00.000Z', day, now)).to.equal(22 * HOUR);
		// overdue (adapter was off): a minute after the start, never in a loop
		expect(nextBackupDelayMs('2026-10-01T10:00:00.000Z', day, now)).to.equal(60_000);
		// a clock jump into the past never waits longer than one interval
		expect(nextBackupDelayMs('2026-10-09T10:00:00.000Z', day, now)).to.equal(day);
		expect(nextBackupDelayMs('kaputt', day, now)).to.equal(60_000);
	});

	it('warns when there is no backup or it is too old', () => {
		const now = Date.parse('2026-10-04T12:00:00.000Z');
		expect(backupStatus([], 1440, 7, now)).to.include({ warning: 'none', lastAt: null, ageHours: null });
		// automatic backup on (daily): stale only after two days
		expect(backupStatus([entry('a', '2026-10-03T12:00:00.000Z')], 1440, 7, now).warning).to.equal(null);
		expect(backupStatus([entry('a', '2026-10-02T11:00:00.000Z')], 1440, 7, now).warning).to.equal('stale');
		// a short interval still gets two days of grace (a night without the adapter)
		expect(backupStatus([entry('a', '2026-10-03T00:00:00.000Z')], 60, 7, now).warning).to.equal(null);
		// off: a week
		expect(backupStatus([entry('a', '2026-09-30T12:00:00.000Z')], 0, 0, now).warning).to.equal(null);
		expect(backupStatus([entry('a', '2026-09-26T12:00:00.000Z')], 0, 0, now)).to.include({
			warning: 'stale',
			ageHours: 192,
		});
		// the newest of any kind counts
		const mixed = [entry('old', '2026-09-01T00:00:00.000Z'), entry('new', '2026-10-04T08:00:00.000Z')];
		expect(backupStatus(mixed, 1440, 7, now)).to.include({ warning: null, ageHours: 4 });
	});

	it('removes a pruned backup from the log', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			db.logBackup({ filename: 'backups/e-invoices-auto-1.zip', size: 1, sha256: 'a', manifestJson: '{}' });
			db.logBackup({ filename: 'backups/e-invoices-auto-2.zip', size: 1, sha256: 'b', manifestJson: '{}' });
			db.deleteBackupLog('backups/e-invoices-auto-1.zip');
			expect(db.listBackups().map(item => item.filename)).to.deep.equal(['backups/e-invoices-auto-2.zip']);
		} finally {
			db.close();
		}
	});
});
