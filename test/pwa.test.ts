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

	it('links the app icon so the browser stops asking for /favicon.ico', () => {
		// Regression 30.09.2026: without a <link rel="icon"> the browser asked
		// for /favicon.ico on every load of the start page and logged "404".
		const src = readFileSync('src-www/index.html', 'utf8');
		expect(src).to.contain('rel="icon"');
		expect(src).to.contain('icons/icon-192.png');
		if (existsSync('www/index.html')) {
			expect(readFileSync('www/index.html', 'utf8')).to.contain('rel="icon"');
		}
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

describe('pwa => wizard opens without TDZ crash', () => {
	it('declares the list guard before the first bootLists() call', () => {
		// Regression 30.09.2026: bootLists() ran before `let listsLoaded`
		// was initialized (temporal dead zone), so #/new died with
		// "can't access lexical declaration before initialization".
		// The route() caller is async, hence "Uncaught (in promise)".
		const src = readFileSync('src-www/src/views/wizard.ts', 'utf8');
		const guard = src.indexOf('let listsLoaded');
		expect(guard, 'let listsLoaded missing').to.be.greaterThan(-1);
		const calls: number[] = [];
		const re = /(?<!function )bootLists\(\)/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(src)) !== null) {
			calls.push(m.index);
		}
		expect(calls.length, 'no bootLists() calls found').to.be.greaterThan(0);
		for (const at of calls) {
			expect(at, 'bootLists() called before let listsLoaded').to.be.greaterThan(guard);
		}
	});
});

describe('pwa => attachments (R4)', () => {
	it('ships one shared Anlagen module with the server rules as a pre-check', () => {
		const src = readFileSync('src-www/src/views/attachments.ts', 'utf8');
		// mirrored from src/lib/attachments.ts — the server stays the judge
		expect(src).to.contain('5 * 1024 * 1024');
		expect(src).to.contain('ATTACHMENT_MAX_COUNT = 10');
		expect(src).to.contain("['pdf', 'png', 'jpg', 'jpeg']");
		// upload as base64 JSON (no multipart), download and delete via the API
		expect(src).to.contain('api.attachments.add');
		expect(src).to.contain('dataBase64');
		expect(src).to.contain('api.attachments.remove');
		expect(src).to.contain('api.attachments.url');
	});

	it('mounts the section in the detail view and in the wizard', () => {
		const detail = readFileSync('src-www/src/views/detail.ts', 'utf8');
		expect(detail).to.contain("mountAttachments(root.querySelector('#d-attachments')!");
		// GoBD: an issued invoice keeps its files but cannot change them
		expect(detail).to.contain("readOnly: inv.status !== 'draft'");
		const wizard = readFileSync('src-www/src/views/wizard.ts', 'utf8');
		expect(wizard).to.contain('<div id="w-attachments"></div>');
		expect(wizard).to.contain('mountAttachments(attachmentHost, s.draftId');
	});

	it('exposes the attachment routes in the API client', () => {
		const api = readFileSync('src-www/src/api.ts', 'utf8');
		expect(api).to.contain('attachments: {');
		expect(api).to.contain('`/api/invoices/${id}/attachments`');
		expect(api).to.contain('`/api/invoices/${id}/attachments/${attachmentId}`');
		expect(api).to.contain("method: 'DELETE'");
	});

	it('ships the built bundle with the Anlagen section', function () {
		const asset = existsSync('www/assets')
			? readdirSync('www/assets').find(f => /^index-.*\.js$/.test(f))
			: undefined;
		if (!asset) {
			this.skip();
			return;
		}
		const bundle = readFileSync(`www/assets/${asset}`, 'utf8');
		expect(bundle).to.contain('Noch keine Anlagen');
		expect(bundle).to.contain('/attachments');
	});
});
describe('pwa => offers (R8)', () => {
	it('ships one label table for both document types, mirroring the server', () => {
		const src = readFileSync('src-www/src/labels.ts', 'utf8');
		// the wording of the sight PDF (documentLabels on the server)
		expect(src).to.contain('Angebotsnr.:');
		expect(src).to.contain('Angebotsdatum:');
		expect(src).to.contain('Gültig bis:');
		expect(src).to.contain('Rechnungsnr.:');
		// the life cycle (quoteState/quoteStateLabel on the server)
		expect(src).to.contain('QUOTE_VALIDITY_DAYS = 30');
		for (const state of ['draft', 'open', 'accepted', 'rejected', 'expired']) {
			expect(src).to.contain(`'${state}'`);
		}
		// the rule the state hangs on: a validity before today expires
		expect(src).to.contain('quote.validUntil < today');
	});

	it('gives offers their own tab, view and wizard entry point', () => {
		const main = readFileSync('src-www/src/main.ts', 'utf8');
		expect(main).to.contain("['#/offers', 'Angebote']");
		expect(main).to.contain("hash === '#/offers'");
		expect(main).to.contain("'#/new/quote'");
		const view = readFileSync('src-www/src/views/offers.ts', 'utf8');
		// the list asks for offers only and carries the whole life cycle
		expect(view).to.contain("docType: 'quote'");
		expect(view).to.contain('api.quoteAccept');
		expect(view).to.contain('api.quoteReject');
		expect(view).to.contain('api.convert');
	});

	it('keeps the booking list and the accounting exports free of offers', () => {
		const dashboard = readFileSync('src-www/src/views/dashboard.ts', 'utf8');
		expect(dashboard).to.contain("params.docType = 'invoice'");
		const api = readFileSync('src-www/src/api.ts', 'utf8');
		// the export query is pinned to invoices unless the caller asks otherwise
		expect(api).to.contain("new URLSearchParams({ docType: 'invoice', ...params }).toString()");
	});

	it('lets the wizard choose the type and hides the invoice-only fields', () => {
		const src = readFileSync('src-www/src/views/wizard.ts', 'utf8');
		expect(src).to.contain('id="w-doctype"');
		expect(src).to.contain('id="w-valid"');
		expect(src).to.contain('docType: s.docType');
		// the validity of an offer follows its issue date while it is untouched
		expect(src).to.contain('syncValidUntil(s, issueBefore)');
		// an offer has no Skonto and no payment terms
		expect(src).to.contain('Ein Angebot kennt kein Zahlungsziel, keinen Skonto und keine Zahlungsbedingungen');
	});

	it('carries the offer actions and the chain in the detail view', () => {
		const src = readFileSync('src-www/src/views/detail.ts', 'utf8');
		expect(src).to.contain("root.querySelector('#d-accept')?.addEventListener");
		expect(src).to.contain("root.querySelector('#d-reject')?.addEventListener");
		expect(src).to.contain("root.querySelector('#d-convert')?.addEventListener");
		// an offer is never paid, so the booking actions stay away
		expect(src).to.contain(`\${!quote && inv.status === 'issued' ? \`<label class="pay">`);
		// offer → invoice and invoice → offer
		expect(src).to.contain('Zugrunde liegendes Angebot');
		expect(src).to.contain('Daraus hervorgegangene Rechnung(en)');
	});

	it('ships the built bundle with the offers tab', function () {
		const asset = existsSync('www/assets')
			? readdirSync('www/assets').find(f => /^index-.*\.js$/.test(f))
			: undefined;
		if (!asset) {
			this.skip();
			return;
		}
		const bundle = readFileSync(`www/assets/${asset}`, 'utf8');
		expect(bundle).to.contain('Angebote');
		expect(bundle).to.contain('In Rechnung umwandeln');
	});
});
