/**
 * External validation of the generated e-invoices (M6): the sample cases are made over the real API stack
 * and every XML is checked with the KoSIT validator (EN 16931, CII). Run `npm run validate` after
 * `npm run build`; the GitHub workflow `validate-invoices` runs the same thing.
 *
 * What it does:
 *   1. starts the end-to-end server on a throw-away data directory,
 *   2. lets `docs/validierung/musterfaelle.mjs` issue the sample cases (full invoice with two VAT rates, small
 *      amount, credit note, reverse charge, Storno, attachment BG-24, Skonto) and keep XML and PDF,
 *   3. downloads the KoSIT validator and its configuration on the first run (pinned by SHA-256) into
 *      `.validation-tools/`, runs it over the XML files and fails when one of them is rejected.
 *
 * The PDF/A-3b check with veraPDF runs in the workflow (Docker image); locally, `docs/validierung/README.md`
 * has the command. Environment: JAVA (default `java`), VALIDATION_OUT (default `.validation-out`),
 * VALIDATION_PORT (default 8098).
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tools = join(repo, '.validation-tools');
const out = resolve(process.env.VALIDATION_OUT ?? join(repo, '.validation-out'));
const port = Number(process.env.VALIDATION_PORT ?? 8098);
const java = process.env.JAVA ?? 'java';
const token = 'validation-token-2026';

/** The tools, pinned: the same files that produced the evidence in `docs/validierung`. */
const VALIDATOR = {
	file: 'validator-1.6.3-standalone.jar',
	url: 'https://github.com/itplr-kosit/validator/releases/download/v1.6.3/validator-1.6.3-standalone.jar',
	sha256: '799e64befca97d4080e03608c80b85dd5a5ecc5f4ae4f35d1116ec2855b9a7c9',
};
const CONFIG = {
	file: 'xrechnung-3.0.2-validator-configuration-2026-08-31.zip',
	url: 'https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip',
	sha256: '2530cd107c414511c5d0462ec10f886910395abfca820db82e83d70bf01221a8',
};

/**
 * SHA-256 of a buffer.
 *
 * @param {Buffer} data - bytes
 */
const sha256 = data => createHash('sha256').update(data).digest('hex');

/**
 * Makes sure a pinned tool is on disk; a download is refused when its checksum does not match.
 *
 * @param {{ file: string; url: string; sha256: string }} tool - file name, source and expected hash
 * @returns {Promise<string>} path of the file
 */
async function fetchTool(tool) {
	const target = join(tools, tool.file);
	if (existsSync(target) && sha256(readFileSync(target)) === tool.sha256) {
		return target;
	}
	console.log(`Downloading ${tool.file} …`);
	const response = await fetch(tool.url, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`Download of ${tool.url} failed: HTTP ${response.status}`);
	}
	const data = Buffer.from(await response.arrayBuffer());
	if (sha256(data) !== tool.sha256) {
		throw new Error(`${tool.file}: the checksum does not match the pinned one (${sha256(data)})`);
	}
	mkdirSync(tools, { recursive: true });
	writeFileSync(target, data);
	return target;
}

/**
 * Unpacks the validator configuration once.
 *
 * @param {string} zipPath - the configuration zip
 * @returns {Promise<string>} directory that holds `scenarios.xml`
 */
async function unpackConfig(zipPath) {
	const target = join(tools, 'config');
	if (existsSync(join(target, 'scenarios.xml'))) {
		return target;
	}
	const JSZip = require('jszip');
	const zip = await JSZip.loadAsync(readFileSync(zipPath));
	for (const [name, entry] of Object.entries(zip.files)) {
		const path = join(target, name);
		if (!resolve(path).startsWith(resolve(target))) {
			throw new Error(`unsafe path in the configuration zip: ${name}`);
		}
		if (entry.dir) {
			mkdirSync(path, { recursive: true });
		} else {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, await entry.async('nodebuffer'));
		}
	}
	if (!existsSync(join(target, 'scenarios.xml'))) {
		throw new Error('scenarios.xml not found in the validator configuration');
	}
	return target;
}

/**
 * Waits until the server answers its health route.
 *
 * @param {string} base - base URL
 */
async function waitForServer(base) {
	for (let i = 0; i < 60; i++) {
		try {
			if ((await fetch(`${base}/api/health`)).ok) {
				return;
			}
		} catch {
			// not up yet
		}
		await new Promise(resolveWait => setTimeout(resolveWait, 500));
	}
	throw new Error('the validation server did not start');
}

/** Makes the sample cases over the real API stack. */
async function generateSamples() {
	rmSync(out, { recursive: true, force: true });
	mkdirSync(out, { recursive: true });
	const data = mkdtempSync(join(tmpdir(), 'e-invoices-validation-'));
	const server = spawn(process.execPath, [join(repo, 'test', 'e2e', 'server.mjs')], {
		env: { ...process.env, E2E_PORT: String(port), E2E_TOKEN: token, E2E_DATA: data },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let log = '';
	server.stdout.on('data', chunk => (log += chunk));
	server.stderr.on('data', chunk => (log += chunk));
	try {
		await waitForServer(`http://127.0.0.1:${port}`);
		const result = spawnSync(process.execPath, [join(repo, 'docs', 'validierung', 'musterfaelle.mjs'), out], {
			env: { ...process.env, API_BASE: `http://127.0.0.1:${port}`, E2E_TOKEN: token },
			encoding: 'utf8',
		});
		process.stdout.write(result.stdout ?? '');
		process.stderr.write(result.stderr ?? '');
		if (result.status !== 0) {
			throw new Error('the sample cases could not be made');
		}
	} catch (error) {
		console.error(log.split('\n').slice(-15).join('\n'));
		throw error;
	} finally {
		server.kill();
		rmSync(data, { recursive: true, force: true });
	}
}

/**
 * Runs the KoSIT validator over the XML files.
 *
 * @param {string} jar - validator jar
 * @param {string} config - configuration directory
 */
async function validateXml(jar, config) {
	const reports = join(out, 'kosit');
	mkdirSync(reports, { recursive: true });
	const xml = readdirSync(out)
		.filter(name => name.endsWith('.xml'))
		.map(name => join(out, name));
	if (xml.length === 0) {
		throw new Error('no XML files to validate');
	}
	// the validator looks at its standard input: a pipe that is closed at once says "nothing to read" (a null device
	// or a terminal-less background process makes it fail)
	const child = spawn(java, ['-jar', jar, '-s', join(config, 'scenarios.xml'), '-r', config, '-o', reports, ...xml], {
		stdio: ['pipe', 'pipe', 'pipe'],
	});
	child.stdin.end();
	let log = '';
	child.stdout.on('data', chunk => (log += chunk));
	child.stderr.on('data', chunk => (log += chunk));
	await new Promise(done => child.on('close', done));
	writeFileSync(join(out, 'kosit.log'), log);

	let failed = 0;
	for (const file of xml) {
		const name = file.slice(file.lastIndexOf(process.platform === 'win32' ? '\\' : '/') + 1).replace(/\.xml$/, '');
		const reportPath = join(reports, `${name}-report.xml`);
		if (!existsSync(reportPath)) {
			console.error(`  ${name.padEnd(34)} no report (see ${join(out, 'kosit.log')})`);
			failed++;
			continue;
		}
		const verdict = /rep:(accept|reject)/.exec(readFileSync(reportPath, 'utf8'))?.[1] ?? 'unknown';
		console.log(`  ${name.padEnd(34)} ${verdict === 'accept' ? 'accepted' : verdict.toUpperCase()}`);
		if (verdict !== 'accept') {
			failed++;
		}
	}
	if (failed > 0) {
		throw new Error(`${failed} of ${xml.length} files were not accepted by the KoSIT validator`);
	}
	console.log(`\nKoSIT: ${xml.length} of ${xml.length} accepted.`);
}

try {
	const jar = await fetchTool(VALIDATOR);
	const config = await unpackConfig(await fetchTool(CONFIG));
	await generateSamples();
	console.log('\nKoSIT validator, scenarios EN 16931 (CII) and XRechnung (CII):');
	await validateXml(jar, config);
} catch (error) {
	console.error(`\nValidation failed: ${error.message}`);
	process.exit(1);
}
