/**
 * Server for the browser tests of `test/e2e`.
 *
 * It runs the **real** server stack — the API and the static web app — on a throwaway
 * data directory, so Playwright talks to the same code the adapter ships, only without
 * ioBroker around it. The build output is required (`npm run build`), because the
 * JavaScript is imported from `build/`.
 *
 * Environment:
 *   E2E_PORT   port to listen on (default 8093, the adapter default)
 *   E2E_TOKEN  token the suite signs in with (default `e2e-token-2026`)
 *   E2E_DATA   data directory (default: a fresh temp directory for this process)
 */

import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
// the server lives in `test/e2e`, so the repository root is two levels up
const repo = join(here, '..', '..');

const { attachStatic, createApiServer } = require(join(repo, 'build/lib/api-server.js'));
const { InvoiceDatabase } = require(join(repo, 'build/lib/db.js'));

const port = Number(process.env.E2E_PORT ?? 8093);
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
// A queued restore replaces the whole database *file*, so the suite needs a file and
// not `:memory:`. Everything this run writes disappears with the directory.
const dataDir = process.env.E2E_DATA ?? mkdtempSync(join(tmpdir(), 'e-invoices-e2e-'));
const artifactDir = join(dataDir, 'artifacts');
mkdirSync(artifactDir, { recursive: true });

/**
 * Maps an artifact path of the API into the data directory and refuses anything that
 * would leave it.
 *
 * @param rel - Path as the API builds it, e.g. `invoices/2026/2026-00-001.pdf`.
 * @returns Absolute path inside the artifact directory.
 */
function artifactPath(rel) {
	const root = resolve(artifactDir);
	const full = resolve(root, rel);
	if (full !== root && !full.startsWith(root + sep)) {
		throw new Error(`artifact path leaves the data directory: ${rel}`);
	}
	return full;
}

const db = new InvoiceDatabase(join(dataDir, 'e-invoices.sqlite'));
db.migrate();

const app = createApiServer({
	db,
	// the same two functions the adapter passes in (main.ts): real files on disk
	storage: {
		write: async (rel, data) => {
			const full = artifactPath(rel);
			mkdirSync(dirname(full), { recursive: true });
			await writeFile(full, data);
		},
		read: rel => readFile(artifactPath(rel)),
	},
	log: { info: console.log, warn: console.warn, error: console.error },
	version: '0.0.1-e2e',
	// a token is configured on purpose: the login page and the 401 handling are part
	// of what the browser tests cover, and /api/health stays reachable without it
	authToken: token,
});

const wwwDir = join(repo, 'www');
if (!attachStatic(app, wwwDir)) {
	console.error(`No web app in ${wwwDir} — run \`npm run build\` before the tests.`);
	process.exit(1);
}

const server = createServer(app);
server.listen(port, '127.0.0.1', () => {
	console.log(`E2E server ready on http://127.0.0.1:${port} (token: ${token}, data: ${dataDir})`);
});
