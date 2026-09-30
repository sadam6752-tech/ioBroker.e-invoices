/**
 * P5 tests: backup roundtrip and corrupt-backup handling.
 */
import { expect } from 'chai';
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import { createBackup, previewRestore, restoreBackup, type BackupStorage } from './backup';
import { InvoiceDatabase } from './db';
import { issueInvoiceWithArtifacts } from './issue-service';

const quiet = { info: (): void => undefined, error: (): void => undefined };

function memoryStorage(): BackupStorage & { files: Map<string, Buffer> } {
	const files = new Map<string, Buffer>();
	return {
		files,
		write: (path: string, data: string | Buffer): Promise<void> => {
			files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
			return Promise.resolve();
		},
		read: (path: string): Promise<Buffer> => {
			const found = files.get(path);
			if (!found) {
				return Promise.reject(new Error(`missing: ${path}`));
			}
			return Promise.resolve(found);
		},
	};
}

const seller = { name: 'S', street: 'a', zip: '1', city: 'B', country: 'DE', vatId: 'DE1' };
const buyer = { name: 'K', street: 'a', zip: '1', city: 'B', country: 'DE', customerNumber: 'K-7' };

async function seedIssued(db: InvoiceDatabase, storage: BackupStorage): Promise<string> {
	db.ensureDefaultTemplate();
	const created = db.createDraft({
		seller,
		buyer,
		lines: [{ description: 'X', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-28',
		currency: 'EUR',
	});
	const outcome = await issueInvoiceWithArtifacts(db, quiet, created.id, storage);
	db.addAttachment(outcome.invoice.id, { filename: 'n.txt', mime: 'text/plain', data: Buffer.from('hi') });
	return outcome.invoice.id;
}

describe('backup => roundtrip', function () {
	this.timeout(60000);

	it('backs up and restores everything', async () => {
		const dbA = new InvoiceDatabase(':memory:');
		dbA.migrate();
		const dbB = new InvoiceDatabase(':memory:');
		dbB.migrate();
		try {
			const storeA = memoryStorage();
			const invoiceId = await seedIssued(dbA, storeA);

			const backup = await createBackup(dbA, storeA, quiet, '0.0.0-test');
			expect(backup.manifest.counts.invoices).to.equal(1);
			expect(backup.manifest.counts.attachments).to.equal(1);
			expect(backup.manifest.files.length).to.be.greaterThan(0);
			expect(backup.data.subarray(0, 2).toString()).to.equal('PK');

			const storeB = memoryStorage();
			const summary = await restoreBackup(dbB, storeB, backup.data, quiet);
			expect(summary.invoices).to.equal(1);
			expect(summary.fileErrors).to.deep.equal([]);
			expect(summary.filesWritten.length).to.equal(backup.manifest.files.length);

			const restored = dbB.getInvoice(invoiceId);
			expect(restored?.number).to.match(/^2026-00-\d{3}$/);
			expect(restored?.xml).to.contain('CrossIndustryInvoice');
			expect(dbB.listAttachments(invoiceId)).to.have.lengthOf(1);
			expect(dbB.listTemplates().length).to.be.greaterThan(0);
			const pdf = await storeB.read(restored?.pdfPath ?? 'missing');
			expect(pdf.subarray(0, 4).toString()).to.equal('%PDF');
		} finally {
			dbA.close();
			dbB.close();
		}
	});

	it('merges counters that differ only by employee-code normalization', async () => {
		const dbA = new InvoiceDatabase(':memory:');
		dbA.migrate();
		const dbB = new InvoiceDatabase(':memory:');
		dbB.migrate();
		try {
			const storeA = memoryStorage();
			await seedIssued(dbA, storeA);
			const backup = await createBackup(dbA, storeA, quiet, '0.0.0-test');

			// databases from before the normalization stored the same employee
			// twice ("0" and "00"); a restore must merge instead of aborting
			const zip = await JSZip.loadAsync(backup.data);
			const dump = JSON.parse(await zip.file('dump.json')!.async('string'));
			const counter = dump.counters[0];
			dump.counters.push({ year: counter.year, employee: '0', last_seq: counter.last_seq + 5 });
			const dumpText = JSON.stringify(dump);
			zip.file('dump.json', dumpText);
			const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
			manifest.dumpSha256 = createHash('sha256').update(dumpText).digest('hex');
			zip.file('manifest.json', JSON.stringify(manifest));
			const legacy = await zip.generateAsync({ type: 'nodebuffer' });

			const summary = await restoreBackup(dbB, memoryStorage(), legacy, quiet);
			expect(summary.invoices).to.equal(1);
			expect(summary.fileErrors).to.deep.equal([]);
			const counters = dbB.exportData().counters;
			expect(counters).to.have.lengthOf(1);
			expect(counters[0].employee).to.equal('00');
			expect(counters[0].last_seq).to.equal(counter.last_seq + 5);
		} finally {
			dbA.close();
			dbB.close();
		}
	});
});

describe('backup => corrupt input', () => {
	it('rejects garbage and tampered zips without touching data', async () => {
		const dbA = new InvoiceDatabase(':memory:');
		dbA.migrate();
		const dbB = new InvoiceDatabase(':memory:');
		dbB.migrate();
		try {
			const storeA = memoryStorage();
			await seedIssued(dbA, storeA);
			const backup = await createBackup(dbA, storeA, quiet, '0.0.0-test');

			const storeB = memoryStorage();

			await restoreBackup(dbB, storeB, Buffer.from('definitely-no-zip'), quiet).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.contain('no valid backup ZIP');
				},
			);
			expect(dbB.listInvoices()).to.have.lengthOf(0);

			const tampered = Buffer.from(backup.data);
			tampered[tampered.length - 20] ^= 0xff;
			await restoreBackup(dbB, storeB, tampered, quiet).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/Checksum|misses|valid backup/i);
				},
			);
			expect(dbB.listInvoices()).to.have.lengthOf(0);
		} finally {
			dbA.close();
			dbB.close();
		}
	});

	it('refuses a zip slip path in the manifest', async () => {
		const dbA = new InvoiceDatabase(':memory:');
		dbA.migrate();
		const dbB = new InvoiceDatabase(':memory:');
		dbB.migrate();
		try {
			const storeA = memoryStorage();
			await seedIssued(dbA, storeA);
			const backup = await createBackup(dbA, storeA, quiet, '0.0.0-test');

			// rebuild the archive with a traversal path and a matching hash
			const zip = await JSZip.loadAsync(backup.data);
			const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
			const payload = Buffer.from('pwned');
			zip.file('files/../../escape.txt', payload);
			manifest.files.push({
				path: '../../escape.txt',
				size: payload.length,
				sha256: createHash('sha256').update(payload).digest('hex'),
			});
			zip.file('manifest.json', JSON.stringify(manifest));

			const evil = await zip.generateAsync({ type: 'nodebuffer' });
			await restoreBackup(dbB, memoryStorage(), evil, quiet).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/unsafe file path/i);
				},
			);
			expect(dbB.listInvoices()).to.have.lengthOf(0);
		} finally {
			dbA.close();
			dbB.close();
		}
	});

	it('rejects a tampered dump.json before touching the database', async () => {
		const dbA = new InvoiceDatabase(':memory:');
		dbA.migrate();
		const dbB = new InvoiceDatabase(':memory:');
		dbB.migrate();
		try {
			const storeA = memoryStorage();
			await seedIssued(dbA, storeA);
			const backup = await createBackup(dbA, storeA, quiet, '0.0.0-test');

			const zip = await JSZip.loadAsync(backup.data);
			const dump = JSON.parse(await zip.file('dump.json')!.async('string'));
			dump.invoices = [];
			zip.file('dump.json', JSON.stringify(dump));
			const evil = await zip.generateAsync({ type: 'nodebuffer' });

			await restoreBackup(dbB, memoryStorage(), evil, quiet).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/Checksum mismatch: dump\.json/);
				},
			);
			expect(dbB.listInvoices()).to.have.lengthOf(0);
		} finally {
			dbA.close();
			dbB.close();
		}
	});
});

describe('backup => zip bomb guard (R3)', () => {
	/**
	 * Creates one real backup ZIP plus a fresh (empty) target database.
	 */
	async function fixture(): Promise<{ backup: Buffer; target: InvoiceDatabase }> {
		const source = new InvoiceDatabase(':memory:');
		source.migrate();
		const target = new InvoiceDatabase(':memory:');
		target.migrate();
		try {
			const store = memoryStorage();
			await seedIssued(source, store);
			const backup = await createBackup(source, store, quiet, '0.0.0-test');
			return { backup: backup.data, target };
		} finally {
			source.close();
		}
	}

	it('rejects an oversized ZIP before it is read', async () => {
		const { backup, target } = await fixture();
		try {
			await previewRestore(target, backup, { zipBytes: 64 }).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/too large/i);
				},
			);
		} finally {
			target.close();
		}
	});

	it('rejects a ZIP with too many entries', async () => {
		const { backup, target } = await fixture();
		try {
			await previewRestore(target, backup, { entries: 1 }).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/too many entries/i);
				},
			);
		} finally {
			target.close();
		}
	});

	it('rejects a ZIP that would expand beyond the limit', async () => {
		const { backup, target } = await fixture();
		try {
			await previewRestore(target, backup, { unpackedBytes: 128 }).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/would expand/i);
				},
			);
		} finally {
			target.close();
		}
	});

	it('rejects a too large dump.json and leaves the database untouched', async () => {
		const { backup, target } = await fixture();
		try {
			await previewRestore(target, backup, { dumpBytes: 128 }).then(
				() => {
					throw new Error('should have thrown');
				},
				(error: Error) => {
					expect(error.message).to.match(/dump\.json is too large/i);
				},
			);
			expect(target.listInvoices()).to.have.lengthOf(0);
		} finally {
			target.close();
		}
	});
});
