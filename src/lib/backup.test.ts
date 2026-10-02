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

/** Minimal PNG (signature plus IHDR marker) — the content decides the type (R4). */
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49]);

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
	// R4: an attachment belongs to the draft — the issue run freezes the record,
	// so the file has to be there before the invoice is issued.
	db.addAttachment(created.id, { filename: 'n.png', mime: 'image/png', data: png });
	const outcome = await issueInvoiceWithArtifacts(db, quiet, created.id, storage);
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
			// R4: attachments are part of the dump (base64) and come back as a
			// BLOB, byte for byte. The price is size: base64 costs about a third
			// more than the file, so a backup with Anlagen grows noticeably —
			// documented in the README.
			const restoredAttachments = dbB.listAttachments(invoiceId);
			expect(restoredAttachments).to.have.lengthOf(1);
			expect(restoredAttachments[0].filename).to.equal('n.png');
			expect(restoredAttachments[0].mime).to.equal('image/png');
			expect(restoredAttachments[0].data.equals(png)).to.equal(true);
			expect(dbB.listTemplates().length).to.be.greaterThan(0);
			const pdf = await storeB.read(restored?.pdfPath ?? 'missing');
			expect(pdf.subarray(0, 4).toString()).to.equal('%PDF');
		} finally {
			dbA.close();
			dbB.close();
		}
	});

	it('restoring an older backup keeps the counters, saves the current state and logs the restore (H3)', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const store = memoryStorage();
			const firstId = await seedIssued(db, store);
			const first = db.getInvoice(firstId)!;
			const older = await createBackup(db, store, quiet, '0.0.0-test');

			// a second invoice is issued after the backup was taken
			const secondId = await seedIssued(db, store);
			const second = db.getInvoice(secondId)!;
			const secondPdf = Buffer.from(store.files.get(second.pdfPath!)!);
			expect(second.number).to.not.equal(first.number);

			const preview = await previewRestore(db, older.data);
			expect(preview.onlyHere).to.deep.equal([second.number]);
			expect(preview.counterAhead.length).to.equal(1);

			const summary = await restoreBackup(db, store, older.data, quiet, undefined, { source: 'test' });

			// the current state was saved before anything was replaced
			expect(summary.safetyBackup).to.match(/^backups\/e-invoices-prerestore-.*\.zip$/);
			expect(store.files.has(summary.safetyBackup!)).to.equal(true);
			const safetyZip = await JSZip.loadAsync(store.files.get(summary.safetyBackup!)!);
			const safetyManifest = JSON.parse(await safetyZip.file('manifest.json')!.async('string'));
			expect(safetyManifest.counts.invoices).to.equal(2);
			expect(db.listBackups().some(b => b.filename === summary.safetyBackup)).to.equal(true);

			// the database is back at one invoice, but its number is not handed out again
			expect(db.allInvoices()).to.have.lengthOf(1);
			expect(summary.countersKept.length).to.equal(1);
			const thirdId = await seedIssued(db, store);
			const third = db.getInvoice(thirdId)!;
			expect(third.number).to.not.equal(first.number);
			expect(third.number).to.not.equal(second.number);
			// and the file of the vanished invoice was not overwritten
			expect(store.files.get(second.pdfPath!)!.equals(secondPdf)).to.equal(true);

			const log = store.files
				.get('backups/restore-log.jsonl')!
				.toString('utf8')
				.trim()
				.split(String.fromCharCode(10));
			expect(log).to.have.lengthOf(1);
			expect(JSON.parse(log[0]).source).to.equal('test');
		} finally {
			db.close();
		}
	});

	it('refuses the restore when the safety backup cannot be written (H3)', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const store = memoryStorage();
			await seedIssued(db, store);
			const backup = await createBackup(db, store, quiet, '0.0.0-test');
			const broken: BackupStorage = {
				read: store.read,
				write: () => Promise.reject(new Error('disk full')),
			};
			let message = '';
			await restoreBackup(db, broken, backup.data, quiet).catch(e => (message = (e as Error).message));
			expect(message).to.contain('safety backup');
			expect(db.allInvoices()).to.have.lengthOf(1);
		} finally {
			db.close();
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

	it('refuses crafted numbers and stored paths in an otherwise valid backup (M4/M5)', async () => {
		const dbA = new InvoiceDatabase(':memory:');
		dbA.migrate();
		try {
			const storeA = memoryStorage();
			await seedIssued(dbA, storeA);
			const backup = await createBackup(dbA, storeA, quiet, '0.0.0-test');

			/** The same backup with one record field changed and every checksum matching. */
			const craft = async (change: (dump: { invoices: Record<string, unknown>[] }) => void): Promise<Buffer> => {
				const zip = await JSZip.loadAsync(backup.data);
				const dump = JSON.parse(await zip.file('dump.json')!.async('string'));
				change(dump);
				const dumpText = JSON.stringify(dump);
				zip.file('dump.json', dumpText);
				const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
				manifest.dumpSha256 = createHash('sha256').update(dumpText).digest('hex');
				zip.file('manifest.json', JSON.stringify(manifest));
				return zip.generateAsync({ type: 'nodebuffer' });
			};
			const attempts: [string, (dump: { invoices: Record<string, unknown>[] }) => void, RegExp][] = [
				['a quote in the number', dump => (dump.invoices[0].number = 'A"; x=1'), /unsafe document number/],
				[
					'a line break in the number',
					dump => (dump.invoices[0].number = '2026-1\r\nSet-Cookie: a=b'),
					/unsafe document number/,
				],
				[
					'a traversal in the PDF path',
					dump => (dump.invoices[0].pdfPath = '../../etc/passwd'),
					/unsafe file path/,
				],
				['an absolute Excel path', dump => (dump.invoices[0].xlsxPath = '/etc/passwd'), /unsafe file path/],
				[
					'an artifact outside invoices/',
					dump => (dump.invoices[0].pdfPath = 'backups/other.zip'),
					/outside invoices/,
				],
			];
			for (const [what, change, expected] of attempts) {
				const dbB = new InvoiceDatabase(':memory:');
				dbB.migrate();
				try {
					await previewRestore(dbB, await craft(change)).then(
						() => {
							throw new Error(`${what} was accepted`);
						},
						(error: Error) => {
							expect(error.message, what).to.match(expected);
						},
					);
					await restoreBackup(dbB, memoryStorage(), await craft(change), quiet).then(
						() => {
							throw new Error(`${what} was restored`);
						},
						(error: Error) => {
							expect(error.message, what).to.match(expected);
						},
					);
					expect(dbB.listInvoices(), what).to.have.lengthOf(0);
				} finally {
					dbB.close();
				}
			}
		} finally {
			dbA.close();
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
