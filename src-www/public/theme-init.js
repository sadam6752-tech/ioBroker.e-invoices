/*
 * Sets the theme before the first paint, so a dark choice does not flash light first.
 * Same rules and the same storage key as src/theme.ts ("light" or "dark" wins, everything else
 * follows the device). It is a separate file because the content security policy of the app
 * allows only its own scripts, no inline ones.
 */
(function () {
	try {
		var choice = localStorage.getItem('e-invoices.theme');
		var systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
		var dark = choice === 'dark' || (choice !== 'light' && systemDark);
		document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		var meta = document.querySelector('meta[name="theme-color"]');
		if (meta) {
			meta.setAttribute('content', dark ? '#2563eb' : '#1a56db');
		}
	} catch (e) {
		// storage blocked: the stylesheet default (light) applies
	}
})();
