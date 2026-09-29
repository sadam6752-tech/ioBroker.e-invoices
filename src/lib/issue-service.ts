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
