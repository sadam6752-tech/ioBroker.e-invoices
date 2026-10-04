/**
 * Performance measurements (R7.6). Not part of the test suites — run on purpose:
 *
 *     npx ts-node test/perf/perf.ts > docs/performance-raw.md
 *
 * Every figure is the median of several runs on a throw-away in-memory database and an
 * in-memory file store, so the numbers show the adapter's own work, not the disk.
 */
import { createBackup, restoreBackup } from '../../src/lib/backup';
import { InvoiceDatabase } from '../../src/lib/db';
import { collectReminderCandidates, issueInvoiceWithArtifacts, type IssueStorage } from '../../src/lib/issue-service';
import { evaluateOpenItems } from '../../src/lib/open-items';
import { renderInvoicePdf } from '../../src/lib/pdf';
import { DEFAULT_TEMPLATE } from '../../src/lib/templates';
import type { InvoiceDraftInput } from '../../src/lib/invoice-model';
import { generateInvoiceXml } from '../../src/lib/zugferd';
import { previewInvoice } from '../../src/lib/api-server';

const quiet = { info: (): void => undefined, error: (): void => undefined };

/** In-memory file store. */
function memory(): IssueStorage & { files: Map<string, Buffer> } {
	const files = new Map<string, Buffer>();
	return {
		files,
		write: (path: string, data: string | Buffer): Promise<void> => {
			files.set(path, Buffer.isBuffer(data) ? data : Buffer.from(data));
			return Promise.resolve();
		},
		read: (path: string): Promise<Buffer> => {
			const found = files.get(path);
			return found ? Promise.resolve(found) : Promise.reject(new Error(`missing: ${path}`));
		},
	};
}

/**
 * Draft with a number of lines.
 *
 * @param lines - Number of positions.
 * @param n - Counter to vary the customer.
 */
function draft(lines: number, n = 0): InvoiceDraftInput {
	return {
		seller: {
			name: 'Muster GmbH',
			street: 'Beispielstr. 1',
			zip: '10115',
			city: 'Berlin',
			country: 'DE',
			vatId: 'DE123456789',
			iban: 'DE02120300000000202051',
		},
		buyer: {
			name: `Kunde ${n} AG`,
			street: 'Kundenweg 5',
			zip: '80331',
			city: 'München',
			country: 'DE',
			customerNumber: `K-${n}`,
		},
		lines: Array.from({ length: lines }, (_v, index) => ({
			description: `Position ${index + 1} mit etwas längerem Beschreibungstext, damit der Umbruch gebraucht wird`,
			quantity: 1 + (index % 5),
			unit: 'Stk',
			unitPriceNet: 10 + (index % 17),
			vatRate: index % 3 === 0 ? 7 : 19,
		})),
		issueDate: `2026-0${1 + (n % 9)}-15`,
		deliveryDate: '2026-01-10',
		dueDate: `2026-0${1 + (n % 9)}-29`,
		currency: 'EUR',
	};
}

/**
 * Median of the milliseconds of `runs` calls.
 *
 * @param runs - How many times.
 * @param fn - What to measure.
 */
async function median(runs: number, fn: () => unknown): Promise<number> {
	const times: number[] = [];
	for (let i = 0; i < runs; i++) {
		const start = performance.now();
		await fn();
		times.push(performance.now() - start);
	}
	times.sort((a, b) => a - b);
	return times[Math.floor(times.length / 2)];
}

/**
 * Formats milliseconds.
 *
 * @param ms - Milliseconds.
 */
function fmt(ms: number): string {
	return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`;
}

/** Runs all measurements and prints a Markdown table per series. */
async function main(): Promise<void> {
	let lastBackup: Buffer = Buffer.alloc(0);
	const out: string[] = [];
	out.push(
		`Node ${process.version}, ${process.platform} ${process.arch}, ${new Date().toISOString().slice(0, 10)}`,
		'',
	);

	// 1. PDF rendering and XML generation by number of positions
	out.push('| Positions | Sight PDF | Pages | CII XML |', '|---:|---:|---:|---:|');
	for (const lines of [50, 200, 500]) {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const invoice = previewInvoice(draft(lines));
		let pages = 0;
		const pdfMs = await median(3, async () => {
			const pdf = await renderInvoicePdf(invoice, DEFAULT_TEMPLATE);
			pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
		});
		const xmlMs = await median(3, () => generateInvoiceXml(invoice, []));
		out.push(`| ${lines} | ${fmt(pdfMs)} | ${pages} | ${fmt(xmlMs)} |`);
		db.close();
	}
	out.push('');

	// 2. complete issue flow (number, XML, hybrid PDF, Excel)
	{
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const store = memory();
		out.push('| Issue flow | Time |', '|---|---:|');
		for (const lines of [5, 50, 200]) {
			const ms = await median(3, async () => {
				const created = db.createDraft(draft(lines));
				await issueInvoiceWithArtifacts(db, quiet, created.id, store);
			});
			out.push(`| ${lines} positions: number + XML + hybrid PDF + Excel | ${fmt(ms)} |`);
		}
		out.push('');
		db.close();
	}

	// 3. big database: list, search, open items, backup, restore
	{
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const store = memory();
		const total = 5000;
		const withFiles = 1000;
		const created = performance.now();
		for (let n = 0; n < total; n++) {
			const d = db.createDraft(draft(3, n));
			if (n < withFiles) {
				await issueInvoiceWithArtifacts(db, quiet, d.id, store);
			} else {
				db.issueDraft(d.id);
			}
		}
		out.push(
			`Seeding ${total} invoices (${withFiles} with XML, PDF and Excel files): ${fmt(performance.now() - created)}`,
			'',
		);
		out.push(`| ${total} invoices | Time |`, '|---|---:|');
		out.push(`| list, first page (50) | ${fmt(await median(5, () => db.listInvoices({ docType: 'invoice' })))} |`);
		out.push(
			`| list, free-text search | ${fmt(await median(3, () => db.listInvoices({ query: 'Kunde 4321' })))} |`,
		);
		out.push(`| list, sorted by amount | ${fmt(await median(3, () => db.listInvoices({ sort: 'amount' })))} |`);
		out.push(`| load all invoices (exports, reports) | ${fmt(await median(3, () => db.allInvoices()))} |`);
		out.push(
			`| open items evaluation (R6.2) | ${fmt(await median(3, () => evaluateOpenItems(db.allInvoices())))} |`,
		);
		out.push(
			`| reminder candidates (dunning check) | ${fmt(await median(3, () => collectReminderCandidates(db, '2027-06-01')))} |`,
		);
		let size = 0;
		const backupMs = await median(1, async () => {
			const backup = await createBackup(db, store, quiet, 'perf');
			size = backup.data.length;
			lastBackup = backup.data;
		});
		out.push(`| backup ZIP (${(size / 1048576).toFixed(1)} MB, ${withFiles * 3} files) | ${fmt(backupMs)} |`);
		const target = new InvoiceDatabase(':memory:');
		target.migrate();
		const restoreMs = await median(1, () =>
			restoreBackup(target, memory(), lastBackup, quiet, {
				zipBytes: 2 ** 30,
				unpackedBytes: 4 * 2 ** 30,
				entries: 100000,
				dumpBytes: 2 ** 30,
			}),
		);
		out.push(`| restore of that backup | ${fmt(restoreMs)} |`);
		out.push('');
		target.close();
		db.close();
	}
	console.log(out.join('\n'));
}

void main();
