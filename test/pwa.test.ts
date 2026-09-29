/**
 * PWA build regression tests (run without js-controller).
 * Guards the service-worker fix: API navigations (PDF/XML downloads)
 * must never be answered with the app shell (blank white page).
 */
import { expect } from 'chai';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

describe('pwa => service worker', () => {
	it('excludes /api from the navigation fallback (source)', () => {
		const config = readFileSync('src-www/vite.config.ts', 'utf8');
		expect(config).to.contain('navigateFallbackDenylist');
		expect(config).to.contain('/^\\/api\\//');
	});

	it('excludes /api from the navigation fallback (built sw.js)', function () {
		if (!existsSync('www/sw.js')) {
			this.skip();
			return;
		}
		const sw = readFileSync('www/sw.js', 'utf8');
		expect(sw).to.contain('NavigationRoute');
		expect(sw).to.contain('/api');
	});

	it('ships manifest, icons and entry point', function () {
		if (!existsSync('www/index.html')) {
			this.skip();
			return;
		}
		expect(existsSync('www/manifest.webmanifest')).to.equal(true);
		expect(existsSync('www/icons/icon-192.png')).to.equal(true);
		expect(existsSync('www/icons/icon-512.png')).to.equal(true);
	});
});

describe('pwa => payment terms drive the due date', () => {
	it('keeps the three presets with their day offsets in the source', () => {
		const src = readFileSync('src-www/src/views/wizard.ts', 'utf8');
		expect(src).to.contain('sofort ohne Abzug');
		expect(src).to.contain('innerhalb von 14 Tagen');
		expect(src).to.contain('30 Tagen nach Rechnungsdatum');
		// every preset carries the window that sets the due date
		const block = src.slice(src.indexOf('const PAYMENT_TERMS_PRESETS'), src.indexOf('const OWN_TERMS'));
		expect(block).to.contain('days: 0');
		expect(block).to.contain('days: 14');
		expect(block).to.contain('days: 30');
	});

	it('binds the change handler to the rendered element, not to collect()', () => {
		// Regression: the handler used to live in collect(), which runs *before*
		// the new innerHTML exists, so choosing a preset did nothing.
		const src = readFileSync('src-www/src/views/wizard.ts', 'utf8');
		const collectStart = src.indexOf('function collect()');
		const stepsStart = src.indexOf('function stepsBar');
		const collectBlock = src.slice(collectStart, stepsStart);
		expect(collectBlock).to.not.contain("#w-terms-select')?.addEventListener");
		// and it must exist at all
		expect(src.slice(src.indexOf('function render('))).to.contain("#w-terms-select')?.addEventListener");
	});

	it('ships the built bundle with the presets and the auto due date', function () {
		const asset = existsSync('www/assets')
			? readdirSync('www/assets').find(f => /^index-.*\.js$/.test(f))
			: undefined;
		if (!asset) {
			this.skip();
			return;
		}
		const bundle = readFileSync(`www/assets/${asset}`, 'utf8');
		expect(bundle).to.contain('sofort ohne Abzug');
		expect(bundle).to.contain('30 Tagen nach Rechnungsdatum');
		// the hint tells the user that the date is derived
		expect(bundle).to.contain('Fällig');
	});
});
