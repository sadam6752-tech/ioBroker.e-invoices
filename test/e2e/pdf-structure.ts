/**
 * Structure of an issued hybrid PDF, read with `pdf-lib`.
 *
 * A raw byte scan does **not** work here: the embedded XML is added by pdf-lib, which
 * writes compressed object streams, so nothing of the catalogue — `/OutputIntents`,
 * `/Metadata` — and of the font dictionaries is visible as plain text in the file
 * (measured 30.09.2026: the served PDF of `2026-01-012` looked "marker-free" until it
 * was parsed). This reader resolves the object streams, so a test can assert what
 * PDF/A-3b actually requires.
 */
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib';

/** One font of the sight component. */
export interface PdfFontInfo {
	/** `/BaseFont`, e.g. `CZZZZZ+LiberationSans` (subsets carry a six letter prefix). */
	baseFont: string;
	/** `true` for a composite font (`/Type0`), the normal case for embedded faces. */
	type0: boolean;
	/** `/FontFile`, `/FontFile2` or `/FontFile3` in the font descriptor. */
	embedded: boolean;
	/** `/ToUnicode` — needed to copy text out of the document. */
	toUnicode: boolean;
}

/** The parts of the structure that PDF/A-3b level B prescribes. */
export interface PdfStructure {
	/** `/OutputIntents[0]/S`, e.g. `GTS_PDFA1`; empty when the entry is missing. */
	outputIntentSubtype: string;
	/** `/OutputIntents[0]/OutputConditionIdentifier`, e.g. the sRGB profile name. */
	outputIntentIdentifier: string;
	/** `/OutputIntents[0]/DestOutputProfile` — the colour profile itself. */
	hasDestOutputProfile: boolean;
	/** `/Metadata` — the XMP packet that states `pdfaid:part 3`. */
	hasXmpMetadata: boolean;
	/** `/AF` — the associated files, this is where the ZUGFeRD XML rides along. */
	hasAssociatedFiles: boolean;
	/** Every font the pages use, without duplicates. */
	fonts: PdfFontInfo[];
}

/**
 * Reads the PDF/A-3b relevant structure of a hybrid PDF.
 *
 * @param bytes - the file as it is served by `/api/invoices/:id.pdf`
 */
export async function readPdfStructure(bytes: Uint8Array): Promise<PdfStructure> {
	const document_ = await PDFDocument.load(bytes, { updateMetadata: false });
	const name = (value: string): PDFName => PDFName.of(value);
	const catalogue = document_.catalog;
	const fonts = new Map<string, PdfFontInfo>();

	const structure: PdfStructure = {
		outputIntentSubtype: '',
		outputIntentIdentifier: '',
		hasDestOutputProfile: false,
		hasXmpMetadata: catalogue.get(name('Metadata')) !== undefined,
		hasAssociatedFiles: catalogue.get(name('AF')) !== undefined,
		fonts: [],
	};

	const intents = catalogue.get(name('OutputIntents'))
		? catalogue.lookup(name('OutputIntents'), PDFArray)
		: undefined;
	const first = intents && intents.size() > 0 ? intents.lookup(0, PDFDict) : undefined;
	if (first) {
		structure.outputIntentSubtype = first.get(name('S'))?.toString().replace(/^\//, '') ?? '';
		structure.outputIntentIdentifier =
			first
				.get(name('OutputConditionIdentifier'))
				?.toString()
				.replace(/^\(|\)$/g, '') ?? '';
		structure.hasDestOutputProfile = first.get(name('DestOutputProfile')) !== undefined;
	}

	for (const page of document_.getPages()) {
		const fontDict = page.node.Resources()?.lookup(name('Font'), PDFDict);
		if (!fontDict) {
			continue;
		}
		for (const [key] of fontDict.entries()) {
			const font = fontDict.lookup(key, PDFDict);
			if (!font) {
				continue;
			}
			// a composite font keeps the descriptor in its descendant font
			let descriptor = font.get(name('FontDescriptor')) ? font.lookup(name('FontDescriptor'), PDFDict) : null;
			if (!descriptor) {
				const descendants = font.get(name('DescendantFonts'))
					? font.lookup(name('DescendantFonts'), PDFArray)
					: null;
				const child = descendants ? descendants.lookup(0, PDFDict) : null;
				descriptor = child?.get(name('FontDescriptor')) ? child.lookup(name('FontDescriptor'), PDFDict) : null;
			}
			const baseFont = font.get(name('BaseFont'))?.toString().replace(/^\//, '') ?? '';
			const info: PdfFontInfo = {
				baseFont,
				type0: font.get(name('Subtype'))?.toString() === '/Type0',
				embedded: Boolean(
					descriptor?.get(name('FontFile2')) ??
					descriptor?.get(name('FontFile3')) ??
					descriptor?.get(name('FontFile')),
				),
				toUnicode: font.get(name('ToUnicode')) !== undefined,
			};
			fonts.set(`${baseFont}|${String(info.type0)}`, info);
		}
	}
	structure.fonts = [...fonts.values()];
	return structure;
}
