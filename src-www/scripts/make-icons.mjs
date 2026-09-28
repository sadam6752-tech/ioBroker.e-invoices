/**
 * Generates PWA icons (192, 512, maskable-512) with zero dependencies.
 * Flat invoice glyph on brand blue, written as raw PNG via node:zlib.
 * Run once: node scripts/make-icons.mjs (output: public/icons/).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [26, 86, 219];
const PAPER = [255, 255, 255];
const LINE = [26, 86, 219];
const SEAL = [22, 163, 74];

/**
 * Draws the invoice glyph into an RGB buffer.
 *
 * @param size - Square edge length in px.
 * @param padding - Extra inner padding (for maskable safe zone).
 */
function draw(size, padding) {
	const px = Buffer.alloc(size * size * 3);
	const rect = (x0, y0, x1, y1, color) => {
		for (let y = Math.max(0, y0); y < Math.min(size, y1); y++) {
			for (let x = Math.max(0, x0); x < Math.min(size, x1); x++) {
				const o = (y * size + x) * 3;
				px[o] = color[0];
				px[o + 1] = color[1];
				px[o + 2] = color[2];
			}
		}
	};
	const circle = (cx, cy, r, color) => {
		for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
			for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
				if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= 0 && y >= 0 && x < size && y < size) {
					const o = (y * size + x) * 3;
					px[o] = color[0];
					px[o + 1] = color[1];
					px[o + 2] = color[2];
				}
			}
		}
	};
	rect(0, 0, size, size, BG);
	const m = Math.floor(size * (0.22 + padding));
	rect(m, m, size - m, size - m - Math.floor(size * 0.06), PAPER);
	const lineH = Math.max(2, Math.floor(size * 0.028));
	let ly = m + Math.floor(size * 0.09);
	for (let i = 0; i < 3; i++) {
		rect(m + Math.floor(size * 0.06), ly, size - m - Math.floor(size * (i === 2 ? 0.3 : 0.06)), ly + lineH, LINE);
		ly += lineH + Math.floor(size * 0.05);
	}
	const cr = size * 0.14;
	const cx = size - m - cr * 0.7;
	const cy = size - m - Math.floor(size * 0.06) - cr * 0.7;
	circle(cx, cy, cr, SEAL);
	rect(Math.floor(cx - cr * 0.45), Math.floor(cy - cr * 0.08), Math.floor(cx), Math.floor(cy + cr * 0.12), PAPER);
	rect(Math.floor(cx - cr * 0.02), Math.floor(cy - cr * 0.5), Math.floor(cx + cr * 0.5), Math.floor(cy + cr * 0.42), PAPER);
	return px;
}

/**
 * Encodes an RGB buffer as PNG.
 *
 * @param size - Square edge length.
 * @param px - Raw RGB bytes.
 */
function toPng(size, px) {
	const raw = Buffer.alloc(size * (size * 3 + 1));
	for (let y = 0; y < size; y++) {
		raw[y * (size * 3 + 1)] = 0;
		px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
	}
	const chunk = (type, data) => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(td) >>> 0);
		return Buffer.concat([len, td, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

for (const [name, size, padding] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.08]]) {
	writeFileSync(join(outDir, name), toPng(size, draw(size, padding)));
	console.log(`wrote ${name} (${size}x${size})`);
}
