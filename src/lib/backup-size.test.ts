/**
 * M2: a backup that the restore would refuse must not be created. The limits of the restore
 * (ZIP size, dump size, unpacked size, number of entries) are checked on the way out as well, with
 * a clear message — otherwise the problem would only show in the emergency.
 */
import { expect } from 'chai';
import { backupSizeProblems, createBackup, DEFAULT_BACKUP_LIMITS, restoreBackup, type BackupLimits } from './backup';
import { InvoiceDatabase } from './db';
import { issueInvoiceWithArtifacts } from './issue-service';

const quiet = { info: (): void => undefined, error: (): void => undefined };

/** File store in memory. */
function memory(): {
	files: Map<string, Buffer>;
	read: (path: string) => Promise<Buffer>;
	write: (path: string, data: string | Buffer) => Promise<void>;
} {
	const files = new Map<string, Buffer>();
	return {
		files,
		read: (path: string): Promise<Buffer> => {
			const found = files.get(path);
			return found ? Promise.resolve(found) : Promise.reject(new Error(`missing: ${path}`));
		},
		write: (path: string, data: string | Buffer): Promise<void> => {
			files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
			return Promise.resolve();
		},
	};
}

/** A PNG signature followed by filler, so the attachment check accepts it and it has a chosen size. */
function png(bytes: number): Buffer {
	const head = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49]);
	return Buffer.concat([head, Buffer.alloc(Math.max(0, bytes - head.length), 7)]);
}

/**
 * An issued invoice with an attachment of the given size.
 *
 * @param db - Database.
 * @param store - File store.
 * @param attachmentBytes - Size of the attachment.
 */
async function issuedWithAttachment(
	db: InvoiceDatabase,
	store: ReturnType<typeof memory>,
	attachmentBytes: number,
): Promise<void> {
	const draft = db.createDraft({
		seller: { name: 'S', street: 'a', zip: '1', city: 'B', country: 'DE', vatId: 'DE1' },
		buyer: { name: 'K', street: 'a', zip: '1', city: 'B', country: 'DE', customerNumber: 'K-7' },
		lines: [{ description: 'X', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-28',
		currency: 'EUR',
	});
	db.addAttachment(draft.id, { filename: 'n.png', mime: 'image/png', data: png(attachmentBytes) });
	await issueInvoiceWithArtifacts(db, quiet, draft.id, store);
}

describe('backup size against the restore limits (M2)', () => {
	const limits: BackupLimits = { zipBytes: 1000, unpackedBytes: 2000, entries: 5, dumpBytes: 3000 };

	it('names every exceeded limit and nothing else', () => {
		expect(
			backupSizeProblems({ dumpBytes: 3000, unpackedBytes: 2000, zipBytes: 1000, entries: 5 }, limits),
		).to.deep.equal([]);
		expect(backupSizeProblems({}, limits)).to.deep.equal([]);
		const all = backupSizeProblems(
			{ dumpBytes: 4_000_000, unpackedBytes: 5_000_000, zipBytes: 6_000_000, entries: 9 },
			limits,
		);
		expect(all).to.have.length(4);
		expect(all[0]).to.contain('dump.json').and.to.contain('limit');
		expect(all.join(' ')).to.contain('9 files');
		expect(backupSizeProblems({ entries: 6 }, limits)).to.have.length(1);
	});

	it('refuses to create a backup whose attachments alone exceed the dump limit, before building it', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const store = memory();
		try {
			await issuedWithAttachment(db, store, 90_000);
			let message = '';
			try {
				await createBackup(db, store, quiet, 'x', 'manual', { ...DEFAULT_BACKUP_LIMITS, dumpBytes: 50_000 });
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).to.contain('Backup not created').and.to.contain('could not be restored');
			expect(message).to.contain('dump.json');
		} finally {
			db.close();
		}
	});

	it('refuses a backup that would unpack beyond the limit and one with too many files', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const store = memory();
		try {
			await issuedWithAttachment(db, store, 2000);
			const tryWith = async (override: Partial<BackupLimits>): Promise<string> => {
				try {
					await createBackup(db, store, quiet, 'x', 'manual', override);
					return '';
				} catch (error) {
					return (error as Error).message;
				}
			};
			expect(await tryWith({ unpackedBytes: 10_000 })).to.contain('unpack');
			expect(await tryWith({ entries: 3 })).to.contain('files');
			// the limits of production leave this small backup alone
			expect(await tryWith({})).to.equal('');
		} finally {
			db.close();
		}
	});

	it('creates exactly the backups that the restore accepts with the same limits', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const target = new InvoiceDatabase(':memory:');
		target.migrate();
		const store = memory();
		try {
			await issuedWithAttachment(db, store, 4000);
			// generous limits: created, and the same limits restore it
			const roomy: BackupLimits = {
				zipBytes: 5_000_000,
				unpackedBytes: 20_000_000,
				entries: 100,
				dumpBytes: 10_000_000,
			};
			const backup = await createBackup(db, store, quiet, 'x', 'manual', roomy);
			const summary = await restoreBackup(target, memory(), backup.data, quiet, roomy);
			expect(summary.invoices).to.equal(1);
		} finally {
			db.close();
			target.close();
		}
	});
});
