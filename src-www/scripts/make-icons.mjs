/**
 * Generates the PWA icons (192, 512, maskable-512) from the adapter logo
 * `admin/e-invoices.png` (512 x 512, the master picture), so the admin icon, the
 * installed app and the favicon always show the same picture. The PNG is the
 * source and not the SVG: the SVG is a traced copy with small artefacts at the edges.
 *
 * It renders the SVG in the Chromium that Playwright already brings for the
 * browser tests (`@playwright/test` is resolved from the adapter root).
 * Run from the adapter root: node src-www/scripts/make-icons.mjs
 * (output: src-www/public/icons/).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const logo = readFileSync(join(root, '..', 'admin', 'e-invoices.png'));
const dataUri = `data:image/png;base64,${logo.toString('base64')}`;

/**
 * Renders the logo into a square PNG.
 *
 * @param browser - Running Chromium.
 * @param size - Edge length in px.
 * @param scale - Share of the square the logo fills (maskable icons keep a safe zone).
 * @param background - CSS background, `transparent` keeps the alpha channel.
 */
async function render(browser, size, scale, background) {
	const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
	await page.setContent(
		`<html><body style="margin:0;background:${background}"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">` +
			`<img src="${dataUri}" style="width:${size * scale}px;height:${size * scale}px"></div></body></html>`,
	);
	await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
	const png = await page.screenshot({ type: 'png', omitBackground: background === 'transparent' });
	await page.close();
	return png;
}

const browser = await chromium.launch();
try {
	writeFileSync(join(outDir, 'icon-192.png'), await render(browser, 192, 1, 'transparent'));
	writeFileSync(join(outDir, 'icon-512.png'), await render(browser, 512, 1, 'transparent'));
	// maskable: opaque, the logo inside the 80 % safe zone of the mask
	writeFileSync(join(outDir, 'maskable-512.png'), await render(browser, 512, 0.7, '#ffffff'));
} finally {
	await browser.close();
}
console.log('icons written to', outDir);
