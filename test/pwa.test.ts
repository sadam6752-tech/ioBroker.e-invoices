/**
 * PWA build regression tests (run without js-controller).
 * Guards the service-worker fix: API navigations (PDF/XML downloads)
 * must never be answered with the app shell (blank white page).
 */
import { expect } from 'chai';
import { existsSync, readFileSync } from 'node:fs';

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
