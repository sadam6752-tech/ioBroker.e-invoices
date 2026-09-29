/**
 * Embedded fonts and colour profile for the sight PDF (PDF/A-3b).
 *
 * pdfkit ships the PDF base-14 fonts, which it only *names* instead of
 * embedding. That is fine on screen but breaks the long-term readability
 * PDF/A requires (ISO 19005-3 § 6.2.11.4.1: every font program has to be part
 * of the file), and it is a hard requirement for XRechnung to public bodies.
 *
 * Liberation Sans is metrically compatible with Helvetica, so the layout is
 * unchanged, and it is licensed under the SIL Open Font License 1.1, which
 * permits commercial use and embedding. The binaries live in assets/fonts
 * next to this module's package root and ship with the adapter.
 *
 * The sRGB profile for `/OutputIntents` is read from the installed pdfkit
 * instead of being copied here: it is part of a dependency we already ship,
 * so the adapter carries no third-party binary whose licence would have to be
 * tracked separately.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/** pdfkit font name for the regular weight. */
export const FONT_REGULAR = 'LibSans';
/** pdfkit font name for the bold weight. */
export const FONT_BOLD = 'LibSans-Bold';
/** pdfkit font name for italics, used by nothing but kept for completeness. */
export const FONT_ITALIC = 'LibSans-Italic';

/** Cached font buffers, so the 400 kB files are read only once. */
const cache = new Map<string, Buffer>();

/**
 * Locates a bundled font file.
 *
 * In the built adapter the assets sit next to `build/lib`, in tests and in
 * ts-node one level higher. Both are probed, and the failure message names
 * the expected path instead of just saying "file not found".
 *
 * @param file - Font filename inside the assets folder.
 * @returns Absolute path of an existing file.
 * @throws {Error} When the file is not bundled.
 */
function locateFont(file: string): string {
	const here = dirname(__filename);
	// build/lib -> package root, and src/lib -> package root
	const candidates = [
		resolve(here, '..', '..', 'assets', 'fonts', file),
		resolve(here, '..', '..', '..', 'assets', 'fonts', file),
		resolve(process.cwd(), 'assets', 'fonts', file),
	];
	for (const path of candidates) {
		try {
			readFileSync(path);
			return path;
		} catch {
			// try the next one
		}
	}
	throw new Error(
		`Bundled font missing: ${file}. Expected it in assets/fonts (tried ${candidates.join(', ')}). ` +
			'Run "npm run build" and make sure assets/fonts is part of the package.',
	);
}

/**
 * Reads a bundled font, cached for the lifetime of the process.
 *
 * @param file - Font filename inside the assets folder.
 * @returns The font bytes.
 */
export function loadFont(file: string): Buffer {
	const hit = cache.get(file);
	if (hit) {
		return hit;
	}
	const data = readFileSync(locateFont(file));
	cache.set(file, data);
	return data;
}

/** True when the Liberation Sans files are present, e.g. for a startup check. */
export function fontsAvailable(): boolean {
	try {
		loadFont('LiberationSans-Regular.ttf');
		loadFont('LiberationSans-Bold.ttf');
		return true;
	} catch {
		return false;
	}
}

/**
 * Registers the embedded fonts on a pdfkit document.
 *
 * Only regular and bold are needed: the layout uses those two weights for the
 * whole document. When the files are missing the document keeps the base-14
 * fonts, which renders identically but is not PDF/A conformant, so the caller
 * is told about it.
 *
 * @param doc - pdfkit document about to be written.
 * @param doc.registerFont - pdfkit's font registration.
 * @param doc.font - pdfkit's font switcher.
 * @returns True when the fonts could be registered.
 */
export function registerFonts(doc: {
	registerFont(name: string, src: Buffer | string): unknown;
	font(name: string): unknown;
}): boolean {
	try {
		doc.registerFont(FONT_REGULAR, loadFont('LiberationSans-Regular.ttf'));
		doc.registerFont(FONT_BOLD, loadFont('LiberationSans-Bold.ttf'));
		doc.font(FONT_REGULAR);
		return true;
	} catch {
		doc.font('Helvetica');
		return false;
	}
}

/** Cached sRGB profile, so the file is read only once. */
let iccProfile: Buffer | null = null;

/**
 * Returns the sRGB IEC 61966-2.1 colour profile for `/OutputIntents`.
 *
 * PDF/A-3b requires an output intent (ISO 19005-3 § 6.2.2): without one the
 * colours are undefined, and `embedFacturX` warns that the result is not
 * conformant. pdfkit already ships the profile next to its font data, so it is
 * resolved from the installed module. That also keeps the adapter free of a
 * second third-party binary.
 *
 * @returns The profile bytes, or undefined when pdfkit does not ship it.
 */
export function loadIccProfile(): Buffer | undefined {
	if (iccProfile) {
		return iccProfile;
	}
	try {
		// pdfkit declares "exports", so its data files cannot be resolved by
		// subpath. The entry point is found instead and the profile sits next
		// to it in the same "js" folder.
		const require = createRequire(resolve(__dirname, '..', '..', 'package.json'));
		const data = readFileSync(resolve(dirname(require.resolve('pdfkit')), 'data', 'sRGB_IEC61966_2_1.icc'));
		// a valid ICC profile starts with a size field, then the "acsp" signature
		if (data.length > 132 && data.subarray(36, 40).toString('latin1') === 'acsp') {
			iccProfile = data;
			return iccProfile;
		}
	} catch {
		// fall through: the caller decides how to report a missing profile
	}
	return undefined;
}
