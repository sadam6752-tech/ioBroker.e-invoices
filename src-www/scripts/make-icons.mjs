/**
 * Generates the icons of the web app on a phone from `src-www/icon-app.png` (512 x 512, opaque, the logo on a
 * colour gradient): the manifest icons (192, 512, maskable-512), the favicon (the 192 one) and the iOS home
 * screen icon (`apple-touch-icon`, 180 px).
 *
 * The phone icons are opaque on purpose: iOS paints transparent areas black, and a home screen wants a full
 * square it can round itself. The admin keeps the transparent logo `admin/e-invoices.png`.
 *
 * It renders in the Chromium that Playwright already brings for the browser tests (`@playwright/test` is
 * resolved from the adapter root).
 * Run from the adapter root: node src-www/scripts/make-icons.mjs
 * (output: src-www/public/icons/ and src-www/public/apple-touch-icon.png).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const master = readFileSync(join(root, 'icon-app.png'));
const dataUri = `data:image/png;base64,${master.toString('base64')}`;

/**
 * Renders the master into a square PNG.
 *
 * @param browser - Running Chromium.
 * @param size - Edge length in px.
 * @param scale - Share of the square the picture fills; below 1 the rest is a gradient blended from the four
 *   corner colours of the picture, so a mask that crops the edges (maskable icons) finds its colours there.
 */
async function render(browser, size, scale) {
	const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
	await page.setContent(
		`<html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c" width="${size}" height="${size}"></canvas>` +
			`<img id="i" src="${dataUri}" style="display:none"></body></html>`,
	);
	await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
	await page.evaluate(
		({ size: edgeLength, scale: share }) => {
			const image = document.getElementById('i');
			const canvas = document.getElementById('c');
			const context = canvas.getContext('2d');
			if (share < 1) {
				// colour of a corner: the average of an 8 x 8 block of the master
				const probe = document.createElement('canvas');
				probe.width = image.naturalWidth;
				probe.height = image.naturalHeight;
				const probeContext = probe.getContext('2d');
				probeContext.drawImage(image, 0, 0);
				const corner = (x, y) => {
					const data = probeContext.getImageData(x, y, 8, 8).data;
					const sum = [0, 0, 0];
					for (let i = 0; i < data.length; i += 4) {
						sum[0] += data[i];
						sum[1] += data[i + 1];
						sum[2] += data[i + 2];
					}
					return sum.map(value => value / (data.length / 4));
				};
				const far = image.naturalWidth - 8;
				const [tl, tr, bl, br] = [corner(0, 0), corner(far, 0), corner(0, far), corner(far, far)];
				const out = context.createImageData(edgeLength, edgeLength);
				for (let y = 0; y < edgeLength; y++) {
					for (let x = 0; x < edgeLength; x++) {
						const u = x / (edgeLength - 1);
						const v = y / (edgeLength - 1);
						const offset = (y * edgeLength + x) * 4;
						for (let channel = 0; channel < 3; channel++) {
							const top = tl[channel] * (1 - u) + tr[channel] * u;
							const bottom = bl[channel] * (1 - u) + br[channel] * u;
							out.data[offset + channel] = top * (1 - v) + bottom * v;
						}
						out.data[offset + 3] = 255;
					}
				}
				context.putImageData(out, 0, 0);
			}
			const edge = edgeLength * share;
			context.drawImage(image, (edgeLength - edge) / 2, (edgeLength - edge) / 2, edge, edge);
		},
		{ size, scale },
	);
	const png = await page.screenshot({ type: 'png' });
	await page.close();
	return png;
}

const browser = await chromium.launch();
try {
	writeFileSync(join(outDir, 'icon-192.png'), await render(browser, 192, 1));
	writeFileSync(join(outDir, 'icon-512.png'), await render(browser, 512, 1));
	// maskable: the picture inside the safe zone of the mask, the colours of the picture around it
	writeFileSync(join(outDir, 'maskable-512.png'), await render(browser, 512, 0.7));
	// iOS home screen: 180 px, full square. The same file lies at the root as well, because iOS asks for
	// /apple-touch-icon.png on its own.
	const touch = await render(browser, 180, 1);
	writeFileSync(join(outDir, 'apple-touch-icon.png'), touch);
	writeFileSync(join(root, 'public', 'apple-touch-icon.png'), touch);
} finally {
	await browser.close();
}
console.log('icons written to', outDir);
