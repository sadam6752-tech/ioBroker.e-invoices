// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config from '@iobroker/eslint-config';
import globals from 'globals';

export default [
	...config,
	{
		// specify files to exclude from linting here
		ignores: [
			'.dev-server/',
			'.vscode/',
			// R5.3: the PWA sources under `src-www/src` *are* linted now (own block
			// below) — exactly there the wizard TDZ stayed invisible while the whole
			// folder was excluded. Only the PWA tooling stays out: `vite.config.ts`
			// and `scripts/` need `vite`/`vite-plugin-pwa`, which the adapter root
			// does not install, and the CI lint run has no `src-www/node_modules`.
			// The PWA build type-checks both itself (`npm --prefix src-www run build`
			// → `tsc --noEmit`).
			'src-www/vite.config.ts',
			'src-www/scripts/',
			'www/',
			'*.test.js',
			'test/**/*.js',
			'*.config.mjs',
			'build',
			'dist',
			'admin/words.js',
			'admin/admin.d.ts',
			'admin/blockly.js',
			'**/adapter-config.d.ts',
			'widgets/**/*.js'
		],
	},
	{
		// R5.3: the PWA is browser code, not adapter code. It therefore gets its own
		// area with DOM globals on top of the Node ones (`fetch`, `URL`,
		// `TextDecoder`, … exist in both) and its own tsconfig (`src-www/tsconfig.json`
		// brings `lib: DOM` and `strict`), so the type-aware rules see the same types
		// the PWA build uses.
		files: ['src-www/src/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
	},
	{
		// R5.3: the return type of every entry in this map already stands in the
		// generic of its call (`request<Invoice>(…)`), so
		// `explicit-module-boundary-types` would only copy each of the ~50 types a
		// second time. Every other file in `src-www` follows the rule (annotations
		// like `export async function dashboard(root: HTMLElement): Promise<void>`),
		// which is exactly why only this file reports it.
		files: ['src-www/src/api.ts'],
		rules: {
			'@typescript-eslint/explicit-module-boundary-types': 'off',
		},
	},
	{
		// you may disable some 'jsdoc' warnings - but using jsdoc is highly recommended
		// as this improves maintainability. jsdoc warnings will not block build process.
		rules: {
			// 'jsdoc/require-jsdoc': 'off',
			// 'jsdoc/require-param': 'off',
			// 'jsdoc/require-param-description': 'off',
			// 'jsdoc/require-returns-description': 'off',
			// 'jsdoc/require-returns-check': 'off',
		},
	},
];