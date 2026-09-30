/**
 * P3 tests: ZUGFeRD XML generation, XSD validation and hybrid embedding.
 * Three fixtures (standard, mixed-rates BASIC, exempt small) must validate
 * cleanly; the hybrid PDF must round-trip its XML.
 */
import { Profile, extractXml, validateXsd } from '@stackforge-eu/factur-x';
import { PDFDocument } from 'pdf-lib';
import { expect } from 'chai';
import { deflateSync, inflateSync } from 'node:zlib';
import { InvoiceDatabase, type StoredAttachment, type StoredInvoice } from './db';
import type { InvoiceDraftInput, InvoiceLine, Party } from './invoice-model';
import {
	applyAdditionalDocuments,
	embedHybridPdf,
	generateInvoiceXml,
	mapUnitCode,
	mapVatCategory,
	resolveProfile,
} from './zugferd';
import { renderInvoicePdf, type TemplateLogoImage } from './pdf';
import { DEFAULT_TEMPLATE, type LayoutTemplate } from './templates';
import { validateArtifacts } from './validation';

const seller: Party = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
	bic: 'BELADEBEXXX',
	email: 'rechnung@muster.example',
};

const buyer: Party = {
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	email: 'einkauf@kunde.example',
	customerNumber: 'K-42',
};

/**
 * Builds a valid draft with overrides.
 *
 * @param overrides - Partial draft fields to replace.
 */
function draft(overrides: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
	return {
		seller,
		buyer,
		lines: [
			{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
			{ description: 'Anfahrt', quantity: 1, unit: 'Stk', unitPriceNet: 50, vatRate: 19 },
		],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		dueDate: '2026-10-12',
		currency: 'EUR',
		documentTitle: 'Rechnung',
		...overrides,
	};
}

/**
 * Extracts searchable text from a pdfkit PDF: page streams are flate
 * compressed and text runs are hex encoded (<414243>) with kerning gaps
 * that may split words. Returns raw, inflated and joined-fragment text.
 *
 * @param pdf - Rendered PDF bytes.
 */
/**
 * Counts embedded image XObjects, i.e. how often the logo was drawn.
 *
 * @param pdf - Rendered PDF buffer.
 */
function countImageObjects(pdf: Buffer): number {
	return (pdf.toString('latin1').match(/\/Subtype\s*\/Image/g) ?? []).length;
}

/**
 * Minimal 1x1-ish PNG with the given size, so imageHeightForWidth works.
 *
 * @param width - Pixel width stored in the PNG header.
 * @param height - Pixel height stored in the PNG header.
 */
function makePng(width: number, height: number): Buffer {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const chunk = (type: string, data: Buffer): Buffer => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length, 0);
		const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body), 0);
		return Buffer.concat([len, body, crc]);
	};
	// 2x2 truecolour image
	const raw = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

function crc32(buf: Buffer): number {
	let crc = 0xffffffff;
	for (const byte of buf) {
		crc ^= byte;
		for (let k = 0; k < 8; k++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Reads the CMap stream of one indirect PDF object.
 *
 * @param pdf - Rendered PDF bytes.
 * @param objNum - Object number as written in the file.
 * @returns The inflated stream, or an empty string.
 */
function readCMap(pdf: Buffer, objNum: string): string {
	const raw = pdf.toString('latin1');
	const start = raw.indexOf(`${objNum} 0 obj`);
	if (start < 0) {
		return '';
	}
	const marker = raw.indexOf('stream\n', start);
	if (marker < 0) {
		return '';
	}
	const from = marker + 'stream\n'.length;
	const to = raw.indexOf('\nendstream', from);
	if (to < 0) {
		return '';
	}
	try {
		return inflateSync(Buffer.from(raw.slice(from, to), 'latin1')).toString('latin1');
	} catch {
		return '';
	}
}

/**
 * Decodes a big-endian UTF-16BE hex string, as used in a CMap.
 *
 * @param hex - Hex digits.
 * @returns The characters it encodes.
 */
function utf16be(hex: string): string {
	const bytes = Buffer.from(hex, 'hex');
	const units: number[] = [];
	for (let i = 0; i + 1 < bytes.length; i += 2) {
		units.push((bytes[i] << 8) | bytes[i + 1]);
	}
	return String.fromCharCode(...units);
}

/**
 * Parses a CMap into a glyph-index to character table.
 *
 * @param cmap - The CMap text.
 * @returns The mapping it declares.
 */
function parseCMap(cmap: string): Map<number, string> {
	const map = new Map<number, string>();
	if (!cmap) {
		return map;
	}
	// bfchar: <src> <dst>
	for (const m of cmap.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
		map.set(parseInt(m[1], 16), utf16be(m[2]));
	}
	// bfrange: <lo> <hi> <dstStart>, or <lo> <hi> [<d1> <d2> ...]
	for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
		for (const row of block[1].matchAll(
			/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g,
		)) {
			const lo = parseInt(row[1], 16);
			const hi = parseInt(row[2], 16);
			if (row[3] !== undefined) {
				// a continuous range: the destination advances with the code
				const prefix = row[3].slice(0, -4);
				const base = parseInt(row[3].slice(-4), 16);
				for (let code = lo; code <= hi && code - lo < 65536; code++) {
					map.set(code, utf16be(prefix + (base + (code - lo)).toString(16).padStart(4, '0')));
				}
			} else if (row[4] !== undefined) {
				const items = [...row[4].matchAll(/<([0-9a-fA-F]+)>/g)].map(i => i[1]);
				items.forEach((dst, index) => map.set(lo + index, utf16be(dst)));
			}
		}
	}
	return map;
}

/**
 * Maps each page font resource (`/F1`, `/F2`, ...) to its own glyph table.
 *
 * Every embedded subset renumbers its glyphs, so regular and bold cannot
 * share one table — mixing them produced garbage like "hre RrdAnde" where
 * "Ihre Rechnung" should be.
 *
 * pdfkit writes a Type0 font whose resource points at the descendant font,
 * and the `/ToUnicode` entry lives on the parent. So the lookup follows
 * `/DescendantFonts` first and only then reads the CMap reference.
 *
 * @param pdf - Rendered PDF bytes.
 * @returns Glyph tables per font resource name.
 */
function readFontMaps(pdf: Buffer): Map<string, Map<number, string>> {
	const raw = pdf.toString('latin1');
	const cmaps = new Map<string, Map<number, string>>();
	for (const m of raw.matchAll(/\/ToUnicode\s+(\d+)\s+0\s+R/g)) {
		cmaps.set(m[1], parseCMap(readCMap(pdf, m[1])));
	}
	/**
	 * Returns the dictionary of an indirect object.
	 *
	 * The same object number can appear twice: once as a `/FontDescriptor`
	 * (referenced by a descendant font) and once as the real font. Only the
	 * latter has the `/Type /Font` subtype and the `/ToUnicode` entry, so the
	 * search skips definitions that are not a font.
	 *
	 * @param objNum - Object number as written in the file.
	 * @returns The object dictionary, or an empty string.
	 */
	const bodyOf = (objNum: string): string => {
		let from = 0;
		for (let attempt = 0; attempt < 8; attempt++) {
			const start = raw.indexOf(`${objNum} 0 obj`, from);
			if (start < 0) {
				return '';
			}
			const window = raw.slice(start, start + 600);
			if (/\/Type\s*\/Font\b/.test(window) && /\/ToUnicode\s+\d+\s+0\s+R/.test(window)) {
				return window;
			}
			from = start + 1;
		}
		return '';
	};
	const byResource = new Map<string, Map<number, string>>();
	for (const m of raw.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
		const toUnicode = bodyOf(m[2]).match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
		const table = toUnicode ? cmaps.get(toUnicode[1]) : undefined;
		if (table && table.size) {
			byResource.set(m[1], table);
		}
	}
	return byResource;
}

/**
 * Decodes a hex run of 16-bit glyph indices with the given table.
 *
 * @param hex - Hex digits from a text operator.
 * @param table - Glyph table of the active font, if known.
 * @returns The decoded characters.
 */
function decodeGlyphs(hex: string, table: Map<number, string> | undefined): string {
	if (!table || hex.length % 4 !== 0) {
		return Buffer.from(hex, 'hex').toString('latin1');
	}
	let out = '';
	for (let i = 0; i + 4 <= hex.length; i += 4) {
		// an unknown index stays visible rather than vanishing silently
		out += table.get(parseInt(hex.slice(i, i + 4), 16)) ?? '�';
	}
	return out;
}

/**
 * Extracts the searchable text of a PDF.
 *
 * With an embedded font the text operators hold subset glyph indices, so the
 * active font is tracked via `Tf` and each run is decoded with that font's
 * `/ToUnicode` CMap. The base-14 fonts store character codes, which decode
 * directly.
 *
 * @param pdf - Rendered PDF bytes.
 * @returns The text, glyph runs separated by spaces.
 */
function pdfText(pdf: Buffer): string {
	const raw = pdf.toString('latin1');
	const parts = [raw];
	const fragments: string[] = [];
	const embedded = /\/BaseFont\s*\/[A-Z]{6}\+/.test(raw);
	const fontMaps = embedded ? readFontMaps(pdf) : new Map<string, Map<number, string>>();
	let active: string | null = null;
	for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
		let text: string;
		try {
			text = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
		} catch {
			// not a flate stream (e.g. embedded files)
			continue;
		}
		// walk the stream in order so `Tf` switches are seen before the runs
		for (const token of text.matchAll(/\/(F\d+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>|\[([^\]]*)\]\s*TJ/g)) {
			if (token[1]) {
				active = token[1];
			} else if (token[2] !== undefined) {
				fragments.push(
					embedded
						? decodeGlyphs(token[2], active ? fontMaps.get(active) : undefined)
						: Buffer.from(token[2], 'hex').toString('latin1'),
				);
			} else if (token[3] !== undefined) {
				for (const h of token[3].matchAll(/<([0-9a-fA-F]+)>/g)) {
					fragments.push(
						embedded
							? decodeGlyphs(h[1], active ? fontMaps.get(active) : undefined)
							: Buffer.from(h[1], 'hex').toString('latin1'),
					);
				}
			}
		}
		parts.push(text);
	}
	// glyph runs are split by kerning numbers, so a space keeps words readable
	parts.push(fragments.join(' '));
	return parts.join('\n');
}

/**
 * Counts PDF pages (regression guard against pdfkit auto-pagination
 * scattering positioned content).
 *
 * @param pdf - Rendered PDF bytes.
 */
async function pageCount(pdf: Buffer): Promise<number> {
	return (await PDFDocument.load(pdf)).getPageCount();
}

/**
 * Reports the fill color in effect for every text run. pdfkit only emits
 * "scn" when the color actually changes, so the color must be tracked as
 * state across the whole content stream instead of read per BT..ET block.
 *
 * @param pdf - Rendered PDF bytes.
 */
function coloredRuns(pdf: Buffer): { y: number; text: string; color: string }[] {
	const raw = pdf.toString('latin1');
	const fontMaps = readFontMaps(pdf);
	const runs: { y: number; text: string; color: string }[] = [];
	for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
		let text: string;
		try {
			text = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
		} catch {
			continue;
		}
		let color = '#000000';
		// the font selection is state too: each run decodes with its own subset
		let active: string | undefined;
		const re =
			/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+scn|1 0 0 1 ([\d.-]+) ([\d.-]+) Tm([\s\S]{0,400}?)ET|\/(F\d+)\s+[\d.]+\s+Tf/g;
		for (const m of text.matchAll(re)) {
			if (m[7] !== undefined) {
				active = m[7];
				continue;
			}
			if (m[1] !== undefined) {
				color = `#${[1, 2, 3]
					.map(i =>
						Math.round(Number(m[i]) * 255)
							.toString(16)
							.padStart(2, '0'),
					)
					.join('')}`;
				continue;
			}
			const fragments: string[] = [];
			// pdfkit emits the font selection after Tm, inside the same BT..ET block
			const fontInBlock = m[6].match(/\/(F\d+)\s+[\d.]+\s+Tf/);
			if (fontInBlock) {
				active = fontInBlock[1];
			}
			for (const hex of m[6].matchAll(/<([0-9a-fA-F]+)>/g)) {
				fragments.push(decodeGlyphs(hex[1], active ? fontMaps.get(active) : undefined));
			}
			const decoded = fragments.join('').trim();
			if (decoded) {
				runs.push({ y: Number(m[5]), text: decoded, color });
			}
		}
	}
	return runs;
}

/**
 * Collects the fill colors of a pdfkit PDF as hex strings. pdfkit writes
 * non-stroking colors as "r g b scn" after "DeviceRGB cs", not as "rg".
 * Used to assert which accent color actually ended up on the page.
 *
 * @param pdf - Rendered PDF bytes.
 */
function fillColors(pdf: Buffer): string[] {
	const raw = pdf.toString('latin1');
	const content: string[] = [];
	for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
		try {
			content.push(inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'));
		} catch {
			// kein flate-Stream
		}
	}
	const found = new Set<string>();
	for (const stream of content) {
		for (const match of stream.matchAll(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+scn\b/g)) {
			const hex = [1, 2, 3]
				.map(i =>
					Math.round(Number(match[i]) * 255)
						.toString(16)
						.padStart(2, '0'),
				)
				.join('')
				.toLowerCase();
			found.add(`#${hex}`);
		}
	}
	return [...found];
}

/**
 * Issues a draft in an isolated in-memory database (no files, no locks).
 *
 * @param input - Draft content to issue.
 */
function issueInMemoryDb(input: InvoiceDraftInput): { db: InvoiceDatabase; invoice: StoredInvoice } {
	const db = new InvoiceDatabase(':memory:');
	db.migrate();
	const created = db.createDraft(input);
	const invoice = db.issueDraft(created.id);
	return { db, invoice };
}

describe('zugferd => mapping helpers', () => {
	it('maps units and vat categories', () => {
		expect(String(mapUnitCode('Std'))).to.equal('HUR');
		expect(String(mapUnitCode('Stk'))).to.equal('C62');
		expect(String(mapVatCategory(19))).to.equal('S');
		expect(String(mapVatCategory(0))).to.equal('E');
	});

	it('rejects MINIMUM/BASIC-WL and unknown profiles', () => {
		expect(() => resolveProfile('MINIMUM')).to.throw();
		expect(() => resolveProfile('BASIC-WL')).to.throw();
		expect(() => resolveProfile('NOPE')).to.throw();
	});
});

describe('zugferd => standard EN16931 invoice', function () {
	this.timeout(60000);
	let ctx: { db: InvoiceDatabase; invoice: StoredInvoice } | null = null;

	afterEach(() => {
		ctx?.db.close();
		ctx = null;
	});

	it('generates XSD-valid XML with all Pflicht markers', async () => {
		ctx = issueInMemoryDb(draft());
		const { xml } = await generateInvoiceXml(ctx.invoice);
		expect(xml).to.contain('CrossIndustryInvoice');
		expect(xml).to.contain(ctx.invoice.number ?? 'NUMBER-MISSING');
		expect(xml).to.contain('<ram:TypeCode>380</ram:TypeCode>');
		expect(xml).to.contain('Muster GmbH');
		expect(xml).to.contain('Kunde AG');
		expect(xml).to.contain('297.50');
		expect(xml).to.contain('K-42');

		const check = await validateArtifacts(ctx.invoice, xml);
		expect(check.formatErrors).to.deep.equal([]);
		expect(check.businessErrors).to.deep.equal([]);
	});

	it('embeds XML into PDF and round-trips it', async () => {
		ctx = issueInMemoryDb(draft());
		const { xml } = await generateInvoiceXml(ctx.invoice);
		const sight = await renderInvoicePdf(ctx.invoice);
		expect(sight.subarray(0, 4).toString()).to.equal('%PDF');

		const hybrid = await embedHybridPdf(sight, xml, ctx.invoice.profile, `Rechnung ${ctx.invoice.number}`);
		expect(Buffer.from(hybrid.subarray(0, 4)).toString()).to.equal('%PDF');

		const extracted = await extractXml(hybrid);
		expect(extracted.xml).to.contain(ctx.invoice.number ?? 'NUMBER-MISSING');
		expect(extracted.xml).to.contain('CrossIndustryInvoice');
	});
});

describe('zugferd => mixed-rates BASIC invoice', function () {
	this.timeout(60000);

	it('validates a discounted 19/7% invoice under BASIC', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					lines: [
						{ description: 'Hardware', quantity: 1, unit: 'Stk', unitPriceNet: 100, vatRate: 19 },
						{
							description: 'Buch',
							quantity: 2,
							unit: 'Stk',
							unitPriceNet: 25,
							vatRate: 7,
							discountPercent: 10,
						},
					],
				}),
			);
			const issued = db.issueDraft(created.id);
			const basic = { ...issued, profile: 'BASIC' };
			const { xml } = await generateInvoiceXml(basic);
			expect(xml).to.contain('145.00');
			expect(xml).to.contain('3.15');
			const check = await validateArtifacts(basic, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => exempt small invoice', function () {
	this.timeout(60000);

	it('validates a 0% exempt invoice with reason', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					lines: [
						{
							description: 'Vermietung Lagerraum',
							quantity: 1,
							unit: 'Stk',
							unitPriceNet: 20,
							vatRate: 0,
							exemptionReason: 'Steuerfrei nach § 4 Nr. 12 UStG',
						},
					],
					documentTitle: 'Rechnung',
				}),
			);
			const issued = db.issueDraft(created.id);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('Steuerfrei nach');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => reverse charge', function () {
	this.timeout(60000);

	it('writes the buyer VAT identifier BR-AE-02 asks for', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					buyer: { ...buyer, vatId: 'DE987654321' },
					lines: [
						{
							description: 'Montageleistung (Steuerschuldnerschaft des Leistungsempfängers)',
							quantity: 1,
							unit: 'Std',
							unitPriceNet: 500,
							vatRate: 0,
							exemptionCategory: 'AE',
							exemptionReason: 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
						},
					],
					documentTitle: 'Rechnung',
				}),
			);
			const issued = db.issueDraft(created.id);
			const { xml } = await generateInvoiceXml(issued);
			// the buyer side now carries the identifier next to the seller side: the KoSIT
			// validator rejected the case before, because BR-AE-02 asks for BT-48 (or BT-47)
			expect(xml).to.contain('DE987654321');
			expect(xml.split('<ram:CategoryCode>AE</ram:CategoryCode>').length - 1).to.be.greaterThan(0);
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => sku, details and phone', function () {
	this.timeout(60000);

	it('maps Art.Nr, Detailzeile and Telefon into CII', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					seller: {
						...seller,
						phone: '+49 30 12345',
						website: 'https://muster.example',
						bankName: 'Musterbank',
					},
					lines: [
						{
							description: 'Produkt A',
							sku: 'ABC123',
							details: 'Detaillierte Beschreibung',
							quantity: 4,
							unit: 'Stk',
							unitPriceNet: 19.95,
							vatRate: 19,
						},
					],
				}),
			);
			const issued = db.issueDraft(created.id);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('ABC123');
			expect(xml).to.contain('Detaillierte Beschreibung');
			expect(xml).to.contain('+49 30 12345');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);

			const pdf = await renderInvoicePdf(issued);
			const text = pdfText(pdf).replace(/\s+/g, '');
			expect(text).to.contain('ABC123');
			expect(text).to.contain('DetaillierteBeschreibung');
			expect(text).to.contain('Zwischensummenetto');
			expect(text).to.contain('Gesamtbetragbrutto');
			expect(text).to.contain('28.09.2026');
			expect(text).to.contain('+493012345');
			expect(text).to.contain('79,80');
			expect(text).to.contain('Musterbank');
			expect(text).to.contain('USt.ID:');
		} finally {
			db.close();
		}
	});
});

describe('pdf => custom footer boxes', () => {
	it('renders company footer texts instead of auto data', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					seller: {
						...seller,
						footerBoxes: ['Box Eins\nZeile zwei', 'Box Zwei', '', 'Box Vier'],
					},
				}),
			);
			const issued = db.issueDraft(created.id);
			const pdf = await renderInvoicePdf(issued);
			const text = pdfText(pdf).replace(/\s+/g, '');
			expect(text).to.contain('BoxEins');
			expect(text).to.contain('BoxVier');
			expect(await pageCount(pdf)).to.equal(1);

			// pdfkit keeps the last fillColor, so the box text used to inherit
			// HEADER_GRAY from the "Gesamt" band of the totals table and was
			// nearly invisible on white. It must be the text color in every
			// combination of the accent switches.
			for (const accent of [true, false]) {
				for (const header of [true, false]) {
					const rendered = await renderInvoicePdf(issued, {
						...DEFAULT_TEMPLATE,
						usePrimaryColor: accent,
						tableHeaderAccent: header,
					});
					const boxRuns = coloredRuns(rendered).filter(r => /Box (Eins|Zwei|Vier)/.test(r.text));
					expect(boxRuns.length, `usePrimaryColor=${accent} tableHeaderAccent=${header}`).to.be.greaterThan(
						0,
					);
					for (const run of boxRuns) {
						expect(run.color).to.equal(DEFAULT_TEMPLATE.colors.text);
					}
				}
			}
		} finally {
			db.close();
		}
	});

	it('repeats the logo on continuation pages only when the template asks for it', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const logo: TemplateLogoImage = { data: makePng(120, 40) };
			const lines: InvoiceLine[] = [];
			for (let i = 0; i < 30; i++) {
				lines.push({ description: `Pos ${i + 1}`, quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 });
			}
			const withLogo = async (allPages: boolean): Promise<number> => {
				const created = db.createDraft(draft({ lines }));
				const issued = db.issueDraft(created.id);
				const pdf = await renderInvoicePdf(
					issued,
					{ ...DEFAULT_TEMPLATE, logo: { path: 'logos/x.png', position: 'right', widthMm: 30, allPages } },
					logo,
				);
				return countImageObjects(pdf);
			};
			expect(await withLogo(true)).to.be.greaterThan(1);
			expect(await withLogo(false)).to.equal(1);
		} finally {
			db.close();
		}
	});

	it('ends with the name, without a greeting line', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const created = db.createDraft(
				draft({
					paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
					seller: { ...seller, iban: 'DE23105000011475563', bic: 'NOLADE21ROS' },
				}),
			);
			const issued = db.issueDraft(created.id);
			const text = pdfText(await renderInvoicePdf(issued)).replace(/\s+/g, '');
			// requested layout: no "Mit freundlichen Grüßen" line below the name
			expect(text).to.not.contain('Mitfreundlichen');
			expect(text).to.contain('Zahlungsbedingungen');
		} finally {
			db.close();
		}
	});

	it('never leaves white text on white paper, whatever the accent switches are', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const issued = db.issueDraft(db.createDraft(draft()).id);
			// White labels are only legal inside the two accent bands, which are
			// exactly the header row and the "Gesamt" line of the totals table.
			const whiteAllowed = [
				'Pos.',
				'Art.Nr.',
				'Bezeichnung',
				'Menge',
				'Einheit',
				'E-Preis',
				'Gesamt',
				'Gesamtbetrag brutto',
			];
			for (const usePrimaryColor of [true, false]) {
				for (const tableHeaderAccent of [true, false]) {
					for (const titleAccent of [true, false]) {
						const pdf = await renderInvoicePdf(issued, {
							...DEFAULT_TEMPLATE,
							usePrimaryColor,
							tableHeaderAccent,
							titleAccent,
						});
						const label = `usePrimaryColor=${usePrimaryColor} tableHeaderAccent=${tableHeaderAccent} titleAccent=${titleAccent}`;
						const whiteText = coloredRuns(pdf)
							.filter(r => r.color === '#ffffff' && !whiteAllowed.some(w => r.text.includes(w)))
							.map(r => r.text);
						expect(whiteText, label).to.deep.equal([]);
					}
				}
			}
		} finally {
			db.close();
		}
	});

	it('applies the three accent color switches independently', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const boxes: [string, string, string, string] = ['Box Eins', 'Box Zwei', 'Box Drei', 'Box Vier'];
			const issued = db.issueDraft(db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] } })).id);
			const primary = DEFAULT_TEMPLATE.colors.primary;
			const gray = '#d9d9d9';
			const render = (over: Partial<LayoutTemplate>): Promise<string[]> =>
				renderInvoicePdf(issued, { ...DEFAULT_TEMPLATE, ...over }).then(fillColors);

			// default: accent on for title and table header, whole header accented
			const all = await render({ usePrimaryColor: true, titleAccent: true, tableHeaderAccent: true });
			expect(all).to.include(primary);

			// usePrimaryColor off: the accent must disappear from the page entirely
			const monochrome = await render({ usePrimaryColor: false });
			expect(monochrome).to.not.include(primary);

			// primary on but title off: the color still has to be used elsewhere
			const noTitle = await render({ usePrimaryColor: true, titleAccent: false, tableHeaderAccent: true });
			expect(noTitle).to.include(primary);

			// table header not accented keeps the neutral gray fill
			const noHeader = await render({ usePrimaryColor: true, titleAccent: false, tableHeaderAccent: false });
			expect(noHeader).to.include(gray);
		} finally {
			db.close();
		}
	});

	it('draws a signature name only when the template configures one', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			// footer boxes are overridden so the seller name appears nowhere else
			const boxes: [string, string, string, string] = ['Box Eins', 'Box Zwei', 'Box Drei', 'Box Vier'];
			const issuedName = db.issueDraft(
				db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] } })).id,
			);
			const issuedPlain = db.issueDraft(
				db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] } })).id,
			);
			const named: LayoutTemplate = { ...DEFAULT_TEMPLATE, signatureName: 'Erika Muster' };
			const plain: LayoutTemplate = { ...DEFAULT_TEMPLATE, signatureName: '' };

			const textWith = pdfText(await renderInvoicePdf(issuedName, named)).replace(/\s+/g, '');
			const textWithout = pdfText(await renderInvoicePdf(issuedPlain, plain)).replace(/\s+/g, '');

			expect(textWith).to.contain('ErikaMuster');
			expect(textWithout).to.not.contain('ErikaMuster');
			// The seller name occurs in metadata, subject line and address block
			// anyway. Without a configured name it must not gain an extra
			// occurrence from an automatic signature fallback.
			const asName: LayoutTemplate = { ...DEFAULT_TEMPLATE, signatureName: seller.name };
			const textAsName = pdfText(await renderInvoicePdf(issuedPlain, asName)).replace(/\s+/g, '');
			// pdfText concatenates raw and inflated streams, so a single drawn line
			// counts twice: only the relative difference is meaningful here.
			const count = (text: string): number => text.split('MusterGmbH').length - 1;
			expect(count(textAsName)).to.be.greaterThan(count(textWithout));
		} finally {
			db.close();
		}
	});

	it('keeps short invoices on one page and long ones sane', async () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const boxes: [string, string, string, string] = ['Test 1', 'Test 1', 'Test 1', 'Test 1'];
			const short = db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] } }));
			const shortIssued = db.issueDraft(short.id);
			expect(await pageCount(await renderInvoicePdf(shortIssued))).to.equal(1);

			const lines = [];
			for (let i = 0; i < 30; i++) {
				lines.push({ description: `Pos ${i + 1}`, quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 });
			}
			const long = db.createDraft(draft({ seller: { ...seller, footerBoxes: [...boxes] }, lines }));
			const longIssued = db.issueDraft(long.id);
			expect(await pageCount(await renderInvoicePdf(longIssued))).to.be.lessThan(5);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => fractional amounts', function () {
	this.timeout(60000);

	it('passes BR-CO-17 on cent fractions', async () => {
		const { db, invoice } = issueInMemoryDb(
			draft({
				lines: [
					{ description: 'A', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
					{ description: 'B', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
					{ description: 'C', quantity: 1, unit: 'Stk', unitPriceNet: 33.335, vatRate: 19 },
				],
			}),
		);
		try {
			const { xml } = await generateInvoiceXml(invoice);
			expect(xml).to.contain('CrossIndustryInvoice');
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});
describe('zugferd => fractional line amounts', function () {
	this.timeout(60000);

	it('keeps line nets and the tax basis in sync (BR-CO-10)', async () => {
		const { db, invoice } = issueInMemoryDb(
			draft({
				lines: [
					{ description: 'A', quantity: 3, unit: 'Stk', unitPriceNet: 0.335, vatRate: 19 },
					{ description: 'B', quantity: 2, unit: 'Stk', unitPriceNet: 10.005, vatRate: 7 },
				],
			}),
		);
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const basis = Number(xml.match(/<ram:TaxBasisTotalAmount>([^<]*)</)?.[1]);
			const lineTotals = [...xml.matchAll(/<ram:LineTotalAmount>([^<]*)</g)].map(m => Number(m[1]));
			// the last LineTotalAmount is the header sum, the ones before it are the lines
			const sumLineNets = lineTotals.slice(0, -1).reduce((a, b) => a + b, 0);
			expect(lineTotals).to.have.lengthOf(3);
			expect(Math.round(sumLineNets * 100) / 100).to.equal(basis);
			expect(lineTotals[lineTotals.length - 1]).to.equal(basis);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => delivery period', function () {
	this.timeout(60000);

	it('writes BT-74/BT-75 and stays XSD-valid', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ deliveryDate: '2026-10-01..2026-10-31' }));
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const period = xml.match(/<ram:BillingSpecifiedPeriod>.*?<\/ram:BillingSpecifiedPeriod>/s)?.[0];
			expect(period).to.contain('20261001');
			expect(period).to.contain('20261031');
			// BT-72 keeps the first day
			expect(xml).to.contain('<ram:OccurrenceDateTime><udt:DateTimeString format="102">20261001');
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});

	it('writes BT-74/BT-75 next to a due date and payment terms', async () => {
		const { db, invoice } = issueInMemoryDb(
			draft({
				deliveryDate: '2026-10-01..2026-10-31',
				dueDate: '2026-11-15',
				paymentTerms: 'Zahlbar innerhalb 14 Tagen',
			}),
		);
		try {
			// the XSD sequence is tax breakdown → billing period → allowances →
			// payment terms → summation
			const { xml } = await generateInvoiceXml(invoice);
			const at = xml.indexOf('<ram:SpecifiedTradeSettlementHeaderMonetarySummation>');
			const period = xml.indexOf('BillingSpecifiedPeriod');
			const terms = xml.indexOf('SpecifiedTradePaymentTerms');
			expect(period).to.be.lessThan(terms);
			expect(terms).to.be.lessThan(at);
		} finally {
			db.close();
		}
	});

	it('omits the billing period for a single-day service', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ deliveryDate: '2026-10-01' }));
		try {
			const { xml } = await generateInvoiceXml(invoice);
			expect(xml).to.not.contain('BillingSpecifiedPeriod');
		} finally {
			db.close();
		}
	});
});

describe('zugferd => skonto and payment state', function () {
	this.timeout(60000);

	it('states the cash discount as note AAK and keeps BT-9 at the gross total', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ skontoPercent: 2, dueDate: '2026-10-12' }));
		try {
			const { xml } = await generateInvoiceXml(invoice);
			// BR-CO-16: a conditional discount is not a prepayment, so the
			// amount due stays the gross total and the terms go into a note
			expect(xml).to.contain(
				`<ram:DuePayableAmount>${invoice.totals.grossTotal.toFixed(2)}</ram:DuePayableAmount>`,
			);
			expect(xml).to.contain('AAK');
			expect(xml).to.contain('2 % Skonto');
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});

	it('sets BT-9 to zero with a prepayment once the invoice is paid', async () => {
		const { db, invoice } = issueInMemoryDb(draft({ skontoPercent: 2, dueDate: '2026-10-12' }));
		try {
			const paid = db.setPaid(invoice.id, true, '2026-10-01');
			const { xml } = await generateInvoiceXml(paid);
			expect(xml).to.contain('<ram:DuePayableAmount>0.00</ram:DuePayableAmount>');
			expect(xml).to.contain(
				`<ram:TotalPrepaidAmount>${invoice.totals.grossTotal.toFixed(2)}</ram:TotalPrepaidAmount>`,
			);
			// a settled invoice no longer advertises the discount
			expect(xml).to.not.contain('2 % Skonto');
		} finally {
			db.close();
		}
	});

	it('emits a credit note with type 381 for a Storno', async () => {
		const { db, invoice } = issueInMemoryDb(draft());
		try {
			const { reversal } = db.reverseInvoice(invoice.id, 'Falsch ausgestellt');
			const issued = db.issueDraft(reversal.id);
			const { xml } = await generateInvoiceXml(issued);
			expect(xml).to.contain('<ram:TypeCode>381</ram:TypeCode>');
			expect(xml).to.contain('Storno zu Rechnung');
			const check = await validateArtifacts(issued, xml);
			expect(check.formatErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});
});

describe('validation => tampered xml', function () {
	this.timeout(60000);

	it('flags business errors when markers are missing', async () => {
		const { db, invoice } = issueInMemoryDb(draft());
		try {
			const { xml } = await generateInvoiceXml(invoice);
			const tampered = xml.split(invoice.number ?? 'NUMBER-MISSING').join('2000-9999');
			const check = await validateArtifacts(invoice, tampered);
			expect(check.businessErrors.length).to.be.greaterThan(0);
		} finally {
			db.close();
		}
	});
});

describe('zugferd => attachments (R4)', function () {
	this.timeout(60000);

	/** PNG signature plus IHDR — the content decides the accepted type. */
	const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);

	/**
	 * Issues a draft that carries one attachment (the record freezes on issue,
	 * so the file has to be attached while it is still a draft).
	 */
	function issuedWithAttachment(): {
		db: InvoiceDatabase;
		invoice: StoredInvoice;
		attachments: StoredAttachment[];
	} {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		const created = db.createDraft(draft());
		db.addAttachment(created.id, { filename: 'Lieferschein.png', mime: 'image/png', data: png });
		const invoice = db.issueDraft(created.id);
		return { db, invoice, attachments: db.listAttachments(invoice.id) };
	}

	it('writes BG-24 with the embedded file into an EN 16931 invoice', async () => {
		const { db, invoice, attachments } = issuedWithAttachment();
		try {
			const { xml, attachmentDocuments } = await generateInvoiceXml(invoice, attachments);
			expect(attachmentDocuments).to.equal(1);
			expect(xml).to.contain('<ram:AdditionalReferencedDocument>');
			expect(xml).to.contain('<ram:IssuerAssignedID>Lieferschein.png</ram:IssuerAssignedID>');
			expect(xml).to.contain('<ram:TypeCode>916</ram:TypeCode>');
			expect(xml).to.contain('<ram:Name>Lieferschein.png</ram:Name>');
			expect(xml).to.contain('mimeCode="image/png" filename="Lieferschein.png"');
			// embedded, not linked: the payload itself travels in the XML and the
			// node carries no external location
			expect(xml).to.contain(png.toString('base64'));
			const node = xml.indexOf('<ram:AdditionalReferencedDocument>');
			const document = xml.slice(node, xml.indexOf('</ram:AdditionalReferencedDocument>') + 1);
			expect(document).to.not.contain('<ram:URIID>');
			// the XSD sequence puts it into the header agreement
			expect(node).to.be.greaterThan(xml.indexOf('<ram:ApplicableHeaderTradeAgreement>'));
			expect(node).to.be.lessThan(xml.indexOf('</ram:ApplicableHeaderTradeAgreement>'));

			const xsd = await validateXsd(xml, Profile.EN16931);
			expect(xsd.valid, xsd.errors.map(e => e.message).join(' | ')).to.equal(true);
			const check = await validateArtifacts(invoice, xml);
			expect(check.formatErrors).to.deep.equal([]);
			expect(check.businessErrors).to.deep.equal([]);
		} finally {
			db.close();
		}
	});

	it('keeps a BASIC invoice free of BG-24, its XSD has no such node', async () => {
		const { db, invoice, attachments } = issuedWithAttachment();
		try {
			const basic = { ...invoice, profile: 'BASIC' };
			const { xml, attachmentDocuments } = await generateInvoiceXml(basic, attachments);
			expect(attachmentDocuments).to.equal(0);
			expect(xml).to.not.contain('AdditionalReferencedDocument');
			const xsd = await validateXsd(xml, Profile.BASIC);
			expect(xsd.valid, xsd.errors.map(e => e.message).join(' | ')).to.equal(true);
		} finally {
			db.close();
		}
	});

	it('refuses to guess where a supporting document belongs', () => {
		expect(() =>
			applyAdditionalDocuments('<x/>', [
				{ filename: 'Anlage.pdf', mime: 'application/pdf', data: Buffer.from('%PDF-1.4') },
			]),
		).to.throw();
	});

	it('lists the Anlagen in the sight component', async () => {
		const { db, invoice, attachments } = issuedWithAttachment();
		try {
			const text = pdfText(await renderInvoicePdf(invoice, DEFAULT_TEMPLATE, undefined, { attachments })).replace(
				/\s+/g,
				'',
			);
			expect(text).to.contain('Anlagen');
			expect(text).to.contain('Lieferschein.png');
			expect(text).to.contain('PNG');
			// an invoice without attachments does not grow the block
			const plain = pdfText(await renderInvoicePdf(invoice)).replace(/\s+/g, '');
			expect(plain).to.not.contain('Anlagen');
		} finally {
			db.close();
		}
	});
});
