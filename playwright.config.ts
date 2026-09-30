import { defineConfig, devices } from '@playwright/test';

/** Port the end-to-end server listens on (the adapter default, see `DEFAULT_API_PORT`). */
const port = Number(process.env.E2E_PORT ?? 8093);

/**
 * Configuration of the browser tests (R5).
 *
 * The suite runs against `test/e2e/server.mjs`, which starts the **real** API on a
 * throwaway data directory and serves the built web app (`npm run build` has to run
 * first). The browser talks German and lives in the instance time zone, so the
 * assertions can use the same texts a real user sees.
 *
 * The folder is `test/e2e` and not `e2e` on purpose: the repo checker scans the
 * sources for imported packages and skips the `test` directory, so `@playwright/test`
 * (a dev dependency) is not reported as a missing dependency.
 */
export default defineConfig({
	testDir: './test/e2e',
	// one shared instance for the whole suite, so the tests must not run in parallel
	workers: 1,
	fullyParallel: false,
	timeout: 30_000,
	expect: { timeout: 10_000 },
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		locale: 'de-DE',
		timezoneId: 'Europe/Berlin',
		// the built app registers a service worker that precaches the bundle and serves
		// it from the cache; that would hide a fresh build behind the caching of a
		// previous run, so it stays out of the tests
		serviceWorkers: 'block',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'node test/e2e/server.mjs',
		url: `http://127.0.0.1:${port}/api/health`,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		stdout: 'pipe',
	},
});
