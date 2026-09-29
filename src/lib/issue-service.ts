/**
 * Shared issue flow for ioBroker.e-invoices (P4c).
 *
 * Used by both the state commands (main.ts) and the HTTP API (api-server.ts)
 * so numbering, generation and storage behave identically. Files go through
 * injected storage: the adapter passes its file mountpoint, tests pass an
 * in-memory map. Rendering uses the default layout template (+ logo).
 */
import type { InvoiceDatabase, StoredInvoice } from './db';
import { renderInvoiceWorkbook } from './excel';
import { daysBetween, todayIso } from './invoice-model';
import { renderInvoicePdf, type TemplateLogoImage } from './pdf';
import { DEFAULT_TEMPLATE, type LayoutTemplate } from './templates';
import { embedHybridPdf, generateInvoiceXml } from './zugferd';

/** Writes one artifact file to `relPath` (e.g. mountpoint or memory). */
export type ArtifactWriter = (relPath: string, data: string | Buffer) => Promise<void>;

/** Reads one artifact file (for logos and downloads). */
export type ArtifactReader = (relPath: string) => Promise<Buffer>;

/** File backend behind the issue flow. */
export interface IssueStorage {
	/** Write an artifact file. */
	write: ArtifactWriter;
	/** Read an artifact file. */
	read: ArtifactReader;
}

/** Minimal logger shape (adapter log compatible). */
export interface IssueLogger {
	/** Info message. */
	info(message: string): void;
	/** Error message. */
	error(message: string): void;
}

/** Outcome of a full issue run. */
export interface IssueOutcome {
	/** Issued invoice with number and artifact links. */
	invoice: StoredInvoice;
	/** Relative path of the hybrid PDF. */
	pdfPath: string;
	/** Relative path of the standalone XML. */
	xmlPath: string;
}

/**
 * Issues a draft (assigns the next number, freezes it), generates the
 * ZUGFeRD XML + hybrid PDF with the default template and stores both.
 * Throws with a clear message when validation or generation fails —
 * the number is then already consumed (GoBD: no reuse).
 *
 * @param db - Open invoice database.
 * @param log - Logger for progress and file errors.
 * @param invoiceId - Draft UUID to issue.
 * @param storage - Artifact file backend.
 */
export async function issueInvoiceWithArtifacts(
	db: InvoiceDatabase,
	log: IssueLogger,
	invoiceId: string,
	storage: IssueStorage,
): Promise<IssueOutcome> {
	const current = db.getInvoice(invoiceId);
	if (!current) {
		throw new Error(`Invoice not found: ${invoiceId}`);
	}
	if (current.status !== 'draft') {
		throw new Error('Only drafts can be issued');
	}
	const issued = db.issueDraft(invoiceId);
	log.info(`Invoice issued: ${issued.number} (${issued.id})`);

	const { template, templateId, logo } = await loadRenderTemplate(db, log, storage);
	const { xml } = await generateInvoiceXml(issued);
	const sight = await renderInvoicePdf(issued, template, logo, {
		stornoOfNumber: issued.stornoOfId ? (db.getInvoice(issued.stornoOfId)?.number ?? null) : null,
	});
	const hybrid = await embedHybridPdf(sight, xml, issued.profile, `${issued.documentTitle} ${issued.number}`);
	const xlsx = await renderInvoiceWorkbook(issued);
	const base = `invoices/${issued.issueDate.slice(0, 4)}/${issued.number}`;

	// Only paths that were really written may be stored: a silent write
	// failure would otherwise leave the DB pointing at 404 downloads.
	const written = new Set<string>();
	try {
		await storage.write(`${base}.xml`, xml);
		written.add(`${base}.xml`);
		log.info(`XML stored: ${base}.xml`);
	} catch (error) {
		log.error(`Cannot write XML file ${base}.xml: ${(error as Error).message}`);
	}
	try {
		await storage.write(`${base}.pdf`, Buffer.from(hybrid));
		written.add(`${base}.pdf`);
		log.info(`Hybrid PDF stored: ${base}.pdf`);
	} catch (error) {
		log.error(`Cannot write PDF file ${base}.pdf: ${(error as Error).message}`);
	}
	try {
		await storage.write(`${base}.xlsx`, xlsx);
		written.add(`${base}.xlsx`);
		log.info(`Excel copy stored: ${base}.xlsx`);
	} catch (error) {
		log.error(`Cannot write Excel file ${base}.xlsx: ${(error as Error).message}`);
	}
	if (written.size === 0) {
		throw new Error(
			`Invoice ${issued.number} was numbered but no artifact could be stored (${base}.*) — check the adapter write permissions`,
		);
	}

	const withArtifacts = db.attachIssueArtifacts(issued.id, {
		xml,
		pdfPath: written.has(`${base}.pdf`) ? `${base}.pdf` : null,
		xlsxPath: written.has(`${base}.xlsx`) ? `${base}.xlsx` : undefined,
		templateId,
	});
	return { invoice: withArtifacts, pdfPath: `${base}.pdf`, xmlPath: `${base}.xml` };
}

/**
 * Issues a batch of drafts in one go ("Serienrechnung").
 *
 * Each draft is numbered and stored on its own, exactly as a single issue
 * would do. A failure in the middle does not roll back what already succeeded:
 * a consumed number must never be reused (GoBD), so the caller gets the list
 * of failures and decides how to continue.
 *
 * @param db - Open invoice database.
 * @param log - Logger.
 * @param invoiceIds - Draft UUIDs, in the order they should be numbered.
 * @param storage - Artifact file backend.
 * @returns Issued invoices and the per-draft errors.
 */
export async function issueInvoiceBatch(
	db: InvoiceDatabase,
	log: IssueLogger,
	invoiceIds: string[],
	storage: IssueStorage,
): Promise<{ issued: StoredInvoice[]; failed: { id: string; error: string }[] }> {
	const issued: StoredInvoice[] = [];
	const failed: { id: string; error: string }[] = [];
	for (const id of invoiceIds) {
		try {
			const outcome = await issueInvoiceWithArtifacts(db, log, id, storage);
			issued.push(outcome.invoice);
		} catch (error) {
			failed.push({ id, error: (error as Error).message });
			log.error(`Batch issue failed for ${id}: ${(error as Error).message}`);
		}
	}
	return { issued, failed };
}

/** One invoice that is due for a dunning reminder. */
export interface ReminderCandidate {
	/** Issued invoice. */
	invoice: StoredInvoice;
	/** Whole days overdue. */
	overdueDays: number;
	/** Reminders already sent. */
	level: number;
	/**
	 * Skonto is still available, so the reminder must mention the discount
	 * instead of demanding the full amount.
	 */
	skontoActive: boolean;
}

/** Day from which an unpaid invoice is chased. */
const REMINDER_GRACE_DAYS = 5;

/**
 * Collects issued, unpaid invoices that are overdue and not yet chased today.
 *
 * The adapter only decides *when* to remind; it never sends anything by
 * itself. That stays a conscious act of the user.
 *
 * @param db - Open invoice database.
 * @param today - ISO reference date, default today.
 * @returns Candidates, oldest first.
 */
export function collectReminderCandidates(db: InvoiceDatabase, today: string = todayIso()): ReminderCandidate[] {
	const out: ReminderCandidate[] = [];
	for (const invoice of db.allInvoices()) {
		if (invoice.status !== 'issued' || invoice.paid || !invoice.dueDate) {
			continue;
		}
		// A Storno reverses an original, chasing the original makes no sense.
		if (db.listInvoices({ status: 'cancelled' }).some(c => c.stornoOfId === invoice.id)) {
			continue;
		}
		const overdueDays = daysBetween(invoice.dueDate, today);
		if (overdueDays < REMINDER_GRACE_DAYS) {
			continue;
		}
		// Never send two reminders on the same day.
		if (invoice.remindedAt?.slice(0, 10) === today) {
			continue;
		}
		const skontoActive =
			(invoice.skontoPercent ?? 0) > 0 && !!invoice.skontoDueDate && invoice.skontoDueDate >= today;
		out.push({
			invoice,
			overdueDays,
			level: invoice.reminderLevel,
			skontoActive,
		});
	}
	return out.sort((a, b) => b.overdueDays - a.overdueDays);
}

/**
 * Re-renders the PDF of an already issued invoice.
 *
 * GoBD: the delivered file must stay reproducible. The original is therefore
 * copied to an archive path first, the fresh rendering is written next to it
 * and the DB keeps pointing at the new file. The invoice content itself is
 * never touched — only the visual rendering of an unchanged document.
 *
 * @param db - Open invoice database.
 * @param log - Logger.
 * @param invoiceId - Issued invoice UUID.
 * @param storage - Artifact file backend.
 * @param reason - Free text stored in the render history.
 */
export async function rerenderInvoicePdf(
	db: InvoiceDatabase,
	log: IssueLogger,
	invoiceId: string,
	storage: IssueStorage,
	reason: string | null,
): Promise<{ invoice: StoredInvoice; pdfPath: string; archivedPath: string | null }> {
	const invoice = db.getInvoice(invoiceId);
	if (!invoice) {
		throw new Error(`Invoice not found: ${invoiceId}`);
	}
	if (invoice.status === 'draft') {
		throw new Error('Only issued invoices can be re-rendered. Issue the draft first.');
	}
	if (!invoice.number) {
		throw new Error('Invoice has no number yet - issue it before re-rendering');
	}

	// Render from the stored invoice data, not from a fresh preview: the numbers,
	// totals and Storno reference must stay exactly as they were issued.
	const { template, templateId, logo } = await loadRenderTemplate(db, log, storage);
	const { xml } = await generateInvoiceXml(invoice);
	const sight = await renderInvoicePdf(invoice, template, logo, {
		stornoOfNumber: invoice.stornoOfId ? (db.getInvoice(invoice.stornoOfId)?.number ?? null) : null,
	});
	const hybrid = await embedHybridPdf(sight, xml, invoice.profile, `${invoice.documentTitle} ${invoice.number}`);

	const base = `invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}`;
	const newPath = `${base}.pdf`;

	// Archive the previous artifact before overwriting it. A missing original is
	// not an error: it just means the file was never stored (write failure).
	let archivedPath: string | null = null;
	if (invoice.pdfPath) {
		archivedPath = `${base}.orig-1.pdf`;
		try {
			const original = await storage.read(invoice.pdfPath);
			await storage.write(archivedPath, original);
			log.info(`Original PDF archived: ${archivedPath}`);
		} catch (error) {
			log.error(`Cannot archive ${invoice.pdfPath}: ${(error as Error).message}`);
			archivedPath = null;
		}
	}

	await storage.write(newPath, Buffer.from(hybrid));
	log.info(`PDF re-rendered: ${newPath} (${invoice.number})`);

	const updated = db.attachIssueArtifacts(invoiceId, {
		xml,
		pdfPath: newPath,
		xlsxPath: invoice.xlsxPath ?? undefined,
		templateId: templateId ?? invoice.templateId,
	});
	db.logRender(invoiceId, 'pdf', archivedPath, newPath, reason);
	return { invoice: updated, pdfPath: newPath, archivedPath };
}

/**
 * Loads the default template and its logo (fail-soft to Standard).
 *
 * @param db - Open invoice database.
 * @param log - Logger.
 * @param storage - Artifact file backend.
 */
export async function loadRenderTemplate(
	db: InvoiceDatabase,
	log: IssueLogger,
	storage: IssueStorage,
): Promise<{ template: LayoutTemplate; templateId: string | null; logo?: TemplateLogoImage }> {
	let template: LayoutTemplate = DEFAULT_TEMPLATE;
	let templateId: string | null = null;
	try {
		const stored = db.getDefaultTemplate();
		if (stored) {
			template = stored.definition;
			templateId = stored.id;
		}
	} catch (error) {
		log.error(`Cannot load default template, using Standard: ${(error as Error).message}`);
	}
	let logo: TemplateLogoImage | undefined;
	if (template.logo?.path) {
		try {
			logo = { data: await storage.read(template.logo.path) };
		} catch (error) {
			log.error(`Cannot read logo ${template.logo.path}, rendering without: ${(error as Error).message}`);
		}
	}
	return { template, templateId, logo };
}
