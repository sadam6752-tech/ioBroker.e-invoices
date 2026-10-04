/**
 * Shared issue flow for ioBroker.e-invoices (P4c).
 *
 * Used by both the state commands (main.ts) and the HTTP API (api-server.ts)
 * so numbering, generation and storage behave identically. Files go through
 * injected storage: the adapter passes its file mountpoint, tests pass an
 * in-memory map. Rendering uses the default layout template (+ logo).
 */
import { createHash } from 'node:crypto';
import type { InvoiceDatabase, StoredAttachmentMeta, StoredInvoice } from './db';
import { renderInvoiceWorkbook } from './excel';
import { daysBetween, isQuote, quoteState, todayIso } from './invoice-model';
import { formatDeDate, renderInvoicePdf, type InvoiceRenderContext, type TemplateLogoImage } from './pdf';
import { embedPdfAttachments } from './pdf-attachments';
import { DEFAULT_TEMPLATE, type LayoutTemplate, type TemplateSnapshot } from './templates';
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
	/** Warning message; optional, because not every logger offers one. */
	warn?(message: string): void;
}

/** Outcome of a full issue run. */
export interface IssueOutcome {
	/** Issued invoice with number and artifact links. */
	invoice: StoredInvoice;
	/** Relative path of the sight/hybrid PDF. */
	pdfPath: string;
	/** Relative path of the standalone XML; null for a quotation (R8). */
	xmlPath: string | null;
}

/**
 * Decision line of a quotation for the sight PDF (R8). Null for an invoice and
 * for a quotation without a decision — the renderer prints only what exists.
 *
 * @param invoice - Stored document.
 */
function quoteDecisionNote(invoice: StoredInvoice): string | null {
	if (!isQuote(invoice.docType)) {
		return null;
	}
	const state = quoteState(invoice);
	if (state === 'accepted' && invoice.acceptedAt) {
		return `Das Angebot wurde am ${formatDeDate(invoice.acceptedAt.slice(0, 10))} angenommen.`;
	}
	if (state === 'rejected') {
		const when = invoice.rejectedAt ? ` am ${formatDeDate(invoice.rejectedAt.slice(0, 10))}` : '';
		const why = invoice.rejectionReason?.trim() ? ` (${invoice.rejectionReason.trim()})` : '';
		return `Das Angebot wurde${when} abgelehnt${why}.`;
	}
	if (state === 'expired' && invoice.validUntil) {
		return `Das Angebot ist am ${formatDeDate(invoice.validUntil)} verfallen.`;
	}
	return null;
}

/**
 * Builds the extra render context: Storno reference, attachments and the
 * quotation chain (R8). An invoice names the offer it came from, a quotation
 * names the invoices that followed it, plus the customer's decision.
 *
 * @param db - Open invoice database.
 * @param invoice - Document that is about to be rendered.
 * @param attachments - Attachments of that document.
 */
function buildRenderContext(
	db: InvoiceDatabase,
	invoice: StoredInvoice,
	attachments: StoredAttachmentMeta[],
): InvoiceRenderContext {
	const source = invoice.sourceDocumentId ? db.getInvoice(invoice.sourceDocumentId) : null;
	return {
		stornoOfNumber: invoice.stornoOfId ? (db.getInvoice(invoice.stornoOfId)?.number ?? null) : null,
		attachments,
		sourceDocumentNumber: source?.number ?? null,
		relatedNumbers: isQuote(invoice.docType)
			? db.listInvoices({ sourceDocumentId: invoice.id, limit: 50 }).map(child => child.number ?? '')
			: [],
		decisionNote: quoteDecisionNote(invoice),
	};
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
	const loaded = await loadRenderTemplate(db, log, storage);
	const { template, templateId, logo } = loaded;
	// M1: make every document once with a placeholder number BEFORE the number is consumed. A defect of the
	// layout, the attachments or the XML then stops here, with the draft untouched and no number lost.
	try {
		await buildArtifacts(
			db,
			{ ...current, number: 'PROBE-000', status: 'issued' },
			template,
			logo,
			db.listAttachments(invoiceId),
		);
	} catch (error) {
		throw new Error(`The documents cannot be created, nothing was issued: ${(error as Error).message}`);
	}
	const issued = db.issueDraft(invoiceId);
	const quote = isQuote(issued.docType);
	log.info(`${quote ? 'Quotation' : 'Invoice'} issued: ${issued.number} (${issued.id})`);
	// N4: the number circle follows the year of the document date, so a date in an earlier year continues the old
	// circle — the numbers are then not in time order. Allowed, but worth a line in the log.
	if (issued.issueDate.slice(0, 4) < todayIso().slice(0, 4)) {
		log.warn?.(
			`${issued.number} carries the date ${issued.issueDate} of an earlier year: it continues that year's number circle, so the numbers are not in time order`,
		);
	}

	// R7.8: the layout is frozen with the document, so a later template edit cannot change
	// what "the layout it was issued with" means
	const templateSnapshot = await freezeTemplate(storage, log, loaded);
	// R4: the attachments of the draft travel with it. They are read before the
	// records are written: the file becomes part of the e-invoice, so they have
	// to sit in the PDF container (PDF/A-3) and — EN 16931 — in the XML (BG-24).
	const attachments = db.listAttachments(invoiceId);
	const { xml, hybrid, xlsx, attachmentDocuments } = await buildArtifacts(db, issued, template, logo, attachments);
	const base = `invoices/${issued.issueDate.slice(0, 4)}/${issued.number}`;
	if (attachments.length > 0) {
		log.info(
			quote
				? `Attachments: ${attachments.length} listed in the quotation PDF (not embedded, R8)`
				: `Attachments: ${attachments.length} embedded in the PDF, ${attachmentDocuments} written into the XML (BG-24)`,
		);
	}

	// Only paths that were really written may be stored: a silent write
	// failure would otherwise leave the DB pointing at 404 downloads.
	const written = new Set<string>();
	// A quotation has no XML to store (R8).
	if (xml) {
		try {
			await storage.write(`${base}.xml`, xml);
			written.add(`${base}.xml`);
			log.info(`XML stored: ${base}.xml`);
		} catch (error) {
			log.error(`Cannot write XML file ${base}.xml: ${(error as Error).message}`);
		}
	}
	try {
		await storage.write(`${base}.pdf`, Buffer.from(hybrid));
		written.add(`${base}.pdf`);
		log.info(`${quote ? 'PDF' : 'Hybrid PDF'} stored: ${base}.pdf`);
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
		xml: xml ?? undefined,
		pdfPath: written.has(`${base}.pdf`) ? `${base}.pdf` : null,
		xlsxPath: written.has(`${base}.xlsx`) ? `${base}.xlsx` : undefined,
		templateId,
		templateSnapshot,
	});
	return {
		invoice: withArtifacts,
		pdfPath: `${base}.pdf`,
		xmlPath: written.has(`${base}.xml`) ? `${base}.xml` : null,
	};
}

/** What is made for a document: the XML (invoices only), the PDF and the Excel copy. */
interface BuiltArtifacts {
	/** The CII XML; null for a quotation. */
	xml: string | null;
	/** The PDF: the hybrid with the XML inside, or the plain sight PDF of a quotation. */
	hybrid: Uint8Array;
	/** The Excel copy. */
	xlsx: Buffer;
	/** Attachments that were written into the XML (BG-24). */
	attachmentDocuments: number;
}

/**
 * Makes the XML, the PDF and the Excel copy of a document (not yet stored).
 *
 * @param db - Open invoice database.
 * @param doc - The document, with its number.
 * @param template - Print layout.
 * @param logo - Logo image, if any.
 * @param attachments - Attachments of the document.
 */
async function buildArtifacts(
	db: InvoiceDatabase,
	doc: StoredInvoice,
	template: LayoutTemplate,
	logo: TemplateLogoImage | undefined,
	attachments: ReturnType<InvoiceDatabase['listAttachments']>,
): Promise<BuiltArtifacts> {
	// R8: a quotation is not an e-invoice. No CII XML, no PDF/A-3 container and
	// no BG-24 — it ships as a plain sight PDF whose files travel next to it.
	const generated = isQuote(doc.docType) ? null : await generateInvoiceXml(doc, attachments);
	const xml = generated?.xml ?? null;
	const sight = await renderInvoicePdf(doc, template, logo, buildRenderContext(db, doc, attachments));
	// `pdf-lib` appends to the existing /AF array, so the Factur-X step below
	// stays the last writer: it owns the XMP packet, the output intent and the
	// trailer /ID that PDF/A-3b is checked for.
	const hybrid = xml
		? await embedHybridPdf(
				await embedPdfAttachments(sight, attachments),
				xml,
				doc.profile,
				`${doc.documentTitle} ${doc.number}`,
			)
		: sight;
	const xlsx = await renderInvoiceWorkbook(doc);
	return { xml, hybrid, xlsx, attachmentDocuments: generated?.attachmentDocuments ?? 0 };
}

/** The parts of an issued document that can be missing. */
export type MissingArtifact = 'xml' | 'pdf' | 'xlsx';

/**
 * Which files an issued document lacks according to the database.
 *
 * @param invoice - An issued document.
 */
export function missingArtifacts(invoice: StoredInvoice): MissingArtifact[] {
	const missing: MissingArtifact[] = [];
	if (!isQuote(invoice.docType) && !invoice.xml) {
		missing.push('xml');
	}
	if (!invoice.pdfPath) {
		missing.push('pdf');
	}
	if (!invoice.xlsxPath) {
		missing.push('xlsx');
	}
	return missing;
}

/**
 * Makes the files an issued document lacks — and only those (M1).
 *
 * The number is consumed when a document is issued and the files follow right after; if that failed, the
 * document stands without them. This builds the missing ones from the stored data: the XML is generated
 * from the record, the PDF is rendered with the layout frozen at issue (the current one when there is
 * none), the Excel copy is written. A file that exists is never touched, and the invoice itself does not
 * change (GoBD).
 *
 * @param db - Open invoice database.
 * @param log - Logger.
 * @param invoiceId - Issued document UUID.
 * @param storage - Artifact file backend.
 * @returns The document and the files that were made.
 */
export async function repairMissingArtifacts(
	db: InvoiceDatabase,
	log: IssueLogger,
	invoiceId: string,
	storage: IssueStorage,
): Promise<{ invoice: StoredInvoice; created: MissingArtifact[] }> {
	let invoice = db.getInvoice(invoiceId);
	if (!invoice) {
		throw new Error(`Invoice not found: ${invoiceId}`);
	}
	if (invoice.status !== 'issued' || !invoice.number) {
		throw new Error('Only issued documents can be completed.');
	}
	const missing = missingArtifacts(invoice);
	const created: MissingArtifact[] = [];
	const base = `invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}`;
	if (missing.includes('xml')) {
		const attachments = db.listAttachments(invoiceId);
		const { xml } = await generateInvoiceXml(invoice, attachments);
		await storage.write(`${base}.xml`, xml);
		invoice = db.attachIssueArtifacts(invoiceId, {
			xml,
			pdfPath: invoice.pdfPath,
			xlsxPath: invoice.xlsxPath ?? undefined,
			templateId: invoice.templateId,
		});
		created.push('xml');
		log.info(`Missing XML made from the stored data: ${base}.xml`);
	}
	if (missing.includes('pdf')) {
		// no PDF exists, so nothing is archived or overwritten; the XML (now stored) is embedded unchanged
		const result = await rerenderInvoicePdf(db, log, invoiceId, storage, 'Datei nachträglich erzeugt', {
			layout: invoice.templateSnapshot ? 'issued' : 'current',
		});
		invoice = result.invoice;
		created.push('pdf');
	}
	if (missing.includes('xlsx')) {
		const xlsx = await renderInvoiceWorkbook(invoice);
		await storage.write(`${base}.xlsx`, xlsx);
		invoice = db.attachIssueArtifacts(invoiceId, {
			xml: invoice.xml ?? undefined,
			pdfPath: invoice.pdfPath,
			xlsxPath: `${base}.xlsx`,
			templateId: invoice.templateId,
		});
		created.push('xlsx');
		log.info(`Missing Excel copy made: ${base}.xlsx`);
	}
	return { invoice, created };
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
	// R6.4: the first dunning level says from which day an unpaid invoice is chased
	const graceDays = db.listDunningTexts()[0].days;
	for (const invoice of db.allInvoices()) {
		if (invoice.status !== 'issued' || invoice.paid || !invoice.dueDate) {
			continue;
		}
		// R8: a quotation is never dunned — there is no debt to chase.
		if (isQuote(invoice.docType)) {
			continue;
		}
		// A credit note (Storno or titled Gutschrift) is no claim either.
		if (invoice.stornoOfId != null || invoice.documentTitle === 'Gutschrift') {
			continue;
		}
		// A reversed original is `cancelled` and dropped by the status check above — it needs no lookup
		// of its own (the old per-invoice search was quadratic and saw only the 50 newest documents).
		const overdueDays = daysBetween(invoice.dueDate, today);
		if (overdueDays < graceDays) {
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
 * First free archive path `<base>.orig-<n>.pdf`, counting up from `start`.
 *
 * @param storage - Artifact file backend.
 * @param base - Artifact path without extension.
 * @param start - First sequence number to try.
 */
async function nextArchivePath(storage: IssueStorage, base: string, start: number): Promise<string> {
	for (let n = Math.max(1, start); n < start + 1000; n++) {
		const candidate = `${base}.orig-${n}.pdf`;
		try {
			await storage.read(candidate);
		} catch {
			return candidate;
		}
	}
	throw new Error(`No free archive slot for ${base}`);
}

/**
 * Re-renders the PDF of an already issued invoice.
 *
 * GoBD: the delivered file must stay reproducible. The original is therefore
 * copied to a fresh, never reused archive path first (`orig-<n>`), the new
 * rendering is written next to it and the DB keeps pointing at the new file.
 * The XML is not regenerated. The invoice content itself is
 * never touched — only the visual rendering of an unchanged document.
 *
 * @param db - Open invoice database.
 * @param log - Logger.
 * @param invoiceId - Issued invoice UUID.
 * @param storage - Artifact file backend.
 * @param reason - Free text stored in the render history.
 * @param options - Which layout to use: `current` (default) or `issued` (R7.8).
 */
export async function rerenderInvoicePdf(
	db: InvoiceDatabase,
	log: IssueLogger,
	invoiceId: string,
	storage: IssueStorage,
	reason: string | null,
	options: RerenderOptions = {},
): Promise<{ invoice: StoredInvoice; pdfPath: string; archivedPath: string | null; layout: RerenderLayout }> {
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
	// R7.8: `issued` renders with the layout frozen at issue, `current` (default) with the
	// template as it is now — the reason for a re-render is usually a changed template.
	const wanted = options.layout ?? 'current';
	if (wanted !== 'issued' && wanted !== 'current') {
		throw new Error(`Unknown layout: ${String(wanted)}`);
	}
	let template: LayoutTemplate;
	let templateId: string | null;
	let logo: TemplateLogoImage | undefined;
	let newSnapshot: TemplateSnapshot | undefined;
	let layout: RerenderLayout;
	if (wanted === 'issued') {
		const frozen = invoice.templateSnapshot;
		if (!frozen) {
			throw new Error(
				'This document has no frozen layout (issued before R7.8) - re-render with the current layout',
			);
		}
		template = frozen.definition;
		templateId = frozen.templateId;
		if (template.logo?.path) {
			try {
				logo = { data: await storage.read(template.logo.path) };
			} catch (error) {
				log.error(
					`Cannot read frozen logo ${template.logo.path}, rendering without: ${(error as Error).message}`,
				);
			}
		}
		layout = 'issued';
	} else {
		const loaded = await loadRenderTemplate(db, log, storage);
		({ template, templateId, logo } = loaded);
		// the layout used now becomes the document's frozen layout
		newSnapshot = await freezeTemplate(storage, log, loaded);
		layout = invoice.templateSnapshot ? 'current' : 'current-unfrozen';
	}
	// R4: the attachments are part of the record, so a re-render reproduces
	// them exactly — an issued invoice keeps its Anlagenverzeichnis and its
	// embedded files.
	const attachments = db.listAttachments(invoiceId);
	// R8: a quotation stays a sight PDF — re-rendering must not invent an XML.
	const quote = isQuote(invoice.docType);
	// GoBD: the XML is the leading document of an e-invoice and is never
	// regenerated. Only a record whose XML was lost at issue time gets a fresh
	// one (written below); otherwise the stored XML is embedded unchanged, so DB,
	// `.xml` file and the XML inside the PDF cannot drift apart.
	let xml: string | null = null;
	let xmlRegenerated = false;
	if (!quote) {
		if (invoice.xml) {
			xml = invoice.xml;
		} else {
			const generated = await generateInvoiceXml(invoice, attachments);
			xml = generated.xml;
			xmlRegenerated = true;
		}
	}
	const sight = await renderInvoicePdf(invoice, template, logo, buildRenderContext(db, invoice, attachments));
	const hybrid = xml
		? await embedHybridPdf(
				await embedPdfAttachments(sight, attachments),
				xml,
				invoice.profile,
				`${invoice.documentTitle} ${invoice.number}`,
			)
		: sight;
	if (attachments.length > 0) {
		log.info(
			quote
				? `Attachments re-listed: ${attachments.length} in the quotation PDF (R8)`
				: `Attachments re-embedded: ${attachments.length} in the PDF, XML (BG-24) kept as issued`,
		);
	}

	const base = `invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}`;
	const newPath = `${base}.pdf`;

	// Archive the previous artifact before overwriting it. A missing original is
	// not an error: it just means the file was never stored (write failure).
	let archivedPath: string | null = null;
	if (invoice.pdfPath) {
		// every re-render keeps its own archive step (`orig-1`, `orig-2`, …); an
		// existing archive file is never overwritten, so the delivered original
		// stays retrievable however often the sight PDF is rendered again
		archivedPath = await nextArchivePath(storage, base, db.listRenderHistory(invoiceId).length + 1);
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
	if (xmlRegenerated && xml) {
		await storage.write(`${base}.xml`, xml);
		log.info(`XML was missing and has been created: ${base}.xml`);
	}

	const updated = db.attachIssueArtifacts(invoiceId, {
		xml: xml ?? undefined,
		pdfPath: newPath,
		xlsxPath: invoice.xlsxPath ?? undefined,
		templateId: templateId ?? invoice.templateId,
		templateSnapshot: newSnapshot,
	});
	db.logRender(invoiceId, 'pdf', archivedPath, newPath, reason, layout);
	return { invoice: updated, pdfPath: newPath, archivedPath, layout };
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
): Promise<LoadedTemplate> {
	let template: LayoutTemplate = DEFAULT_TEMPLATE;
	let templateId: string | null = null;
	let templateName = DEFAULT_TEMPLATE.name;
	let templateVersion: number | null = null;
	try {
		const stored = db.getDefaultTemplate();
		if (stored) {
			template = stored.definition;
			templateId = stored.id;
			templateName = stored.name;
			templateVersion = stored.version;
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
	return { template, templateId, templateName, templateVersion, logo };
}

/** Which layout a re-render uses (R7.8). */
export type RerenderLayout = 'issued' | 'current' | 'current-unfrozen';

/** Options of a re-render. */
export interface RerenderOptions {
	/** `issued` = the frozen layout, `current` = the template as it is now (default). */
	layout?: 'issued' | 'current';
}

/** A template as loaded for rendering. */
export interface LoadedTemplate {
	/** Layout definition. */
	template: LayoutTemplate;
	/** Template id, null for the built-in default. */
	templateId: string | null;
	/** Template name. */
	templateName: string;
	/** Template version, null for the built-in default. */
	templateVersion: number | null;
	/** Logo bytes, when the template has one that could be read. */
	logo?: TemplateLogoImage;
}

/**
 * Freezes a loaded template for storage with a document (R7.8).
 *
 * The logo is copied to a content-addressed file (`logos/frozen/<sha256>.<ext>`):
 * the template's own logo file is overwritten on the next upload. An existing frozen
 * file is kept, so equal logos share one copy. Fail-soft: when the copy cannot be
 * written the snapshot is stored without a logo rather than blocking the issue.
 *
 * @param storage - Artifact file backend.
 * @param log - Logger.
 * @param loaded - The template as loaded for this render.
 */
export async function freezeTemplate(
	storage: IssueStorage,
	log: IssueLogger,
	loaded: LoadedTemplate,
): Promise<TemplateSnapshot> {
	const definition = JSON.parse(JSON.stringify(loaded.template)) as LayoutTemplate;
	if (definition.logo?.path) {
		if (loaded.logo) {
			const ext =
				/\.(png|jpe?g)$/i.exec(definition.logo.path)?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'png';
			const frozenPath = `logos/frozen/${createHash('sha256').update(loaded.logo.data).digest('hex')}.${ext}`;
			try {
				let exists = false;
				try {
					exists = (await storage.read(frozenPath)).equals(loaded.logo.data);
				} catch {
					// not there yet
				}
				if (!exists) {
					await storage.write(frozenPath, loaded.logo.data);
				}
				definition.logo.path = frozenPath;
			} catch (error) {
				log.error(`Cannot freeze logo, snapshot without logo: ${(error as Error).message}`);
				delete definition.logo;
			}
		} else {
			// the logo could not be read, so the document was rendered without it
			delete definition.logo;
		}
	}
	return {
		templateId: loaded.templateId,
		templateName: loaded.templateName,
		templateVersion: loaded.templateVersion,
		definition,
		frozenAt: new Date().toISOString(),
	};
}
