const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { tests } = require('@iobroker/testing');
const { LATEST_SCHEMA_VERSION } = require('../build/lib/migrations');

/** Own port, so the run never collides with a dev-server on 8093. */
const PORT = 18093;
const BASE = `http://127.0.0.1:${PORT}`;

/** A complete draft: the issue flow only accepts what the mandatory fields allow. */
const DRAFT = {
	seller: {
		name: 'Muster GmbH',
		street: 'Beispielstr. 1',
		zip: '10115',
		city: 'Berlin',
		country: 'DE',
		vatId: 'DE123456789',
		iban: 'DE02120300000000202051',
		email: 'rechnung@muster.example',
	},
	buyer: {
		name: 'Kunde AG',
		street: 'Kundenweg 5',
		zip: '80331',
		city: 'München',
		country: 'DE',
		customerNumber: 'K-42',
	},
	lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
	issueDate: '2026-09-28',
	deliveryDate: '2026-09-27',
	dueDate: '2026-10-12',
	currency: 'EUR',
	documentTitle: 'Rechnung',
};

/** The states the adapter promises (io-package.json instanceObjects plus ensureObjects). */
const STATES = [
	'info.connection',
	'info.invoiceCount',
	'info.draftCount',
	'info.issuedCount',
	'info.lastNumber',
	'info.lastIssuedAt',
	'info.dbVersion',
	'info.lastBackup',
	'info.overdueCount',
	'info.overdueList',
	'info.reminderSuggestions',
	'info.backupWarning',
	'info.lastReminderCheck',
	'control.createDraft',
	'control.lastDraftId',
	'control.issueId',
	'control.issue',
	'control.refresh',
	'control.backup',
	'control.restoreId',
	'control.restore',
];

/**
 * Waits until a condition holds (polling), so no test depends on a fixed sleep.
 *
 * @param {() => Promise<unknown>} check - Returns something truthy when done.
 * @param {string} what - Description for the timeout message.
 * @param {number} timeoutMs - Longest wait.
 */
async function waitFor(check, what, timeoutMs = 30000) {
	const until = Date.now() + timeoutMs;
	for (;;) {
		const value = await check();
		if (value) {
			return value;
		}
		if (Date.now() > until) {
			throw new Error(`Timeout waiting for ${what}`);
		}
		await new Promise(resolve => setTimeout(resolve, 200));
	}
}

/**
 * Calls the adapter's HTTP API.
 *
 * @param {string} route - Path below the base URL.
 * @param {RequestInit} [init] - fetch options.
 */
async function api(route, init) {
	return fetch(`${BASE}${route}`, init);
}

/**
 * Posts JSON.
 *
 * @param {string} route - Path below the base URL.
 * @param {unknown} body - JSON body.
 */
async function postJson(route, body) {
	return api(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

/**
 * True when nothing listens on the port any more (the socket was released).
 *
 * @param {number} port - TCP port.
 */
function portIsFree(port) {
	return new Promise(resolve => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
	});
}

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
	defineAdditionalTests({ suite }) {
		suite('R5.2: states, issue flow, backup and restart on a real js-controller', getHarness => {
			let harness;
			let ns;
			/** Reads a state value of this instance. */
			const read = async id => (await harness.states.getStateAsync(`${ns}.${id}`))?.val;
			/**
			 * Presses a button state the way a script or a vis widget does and waits until
			 * the adapter acknowledged it, i.e. until the command has finished.
			 */
			const press = async (id, timeoutMs = 60000) => {
				const pressedAt = Date.now();
				await harness.states.setStateAsync(`${ns}.${id}`, { val: true, ack: false });
				await waitFor(
					async () => {
						const state = await harness.states.getStateAsync(`${ns}.${id}`);
						return state && state.ack === true && state.ts >= pressedAt;
					},
					`${id} to be acknowledged`,
					timeoutMs,
				);
			};

			before(async function () {
				this.timeout(120000);
				harness = getHarness();
				ns = `${harness.adapterName}.0`;
				// the instance data (SQLite file) lives outside the databases the harness resets: start from nothing
				fs.rmSync(path.join(os.tmpdir(), `test-iobroker.${harness.adapterName}`, 'iobroker-data', ns), {
					recursive: true,
					force: true,
				});
				// own port, loopback, no timers: the run must not depend on what an earlier install left behind
				await harness.changeAdapterConfig(harness.adapterName, {
					native: {
						port: PORT,
						bind: '127.0.0.1',
						authToken: '',
						// automatic backup every minute (the shortest allowed), only the newest one is kept
						backupIntervalMinutes: 1,
						backupKeep: 1,
						reminderCheckHours: 0,
					},
				});
				await harness.startAdapterAndWait(true);
			});

			it('creates every promised state and reports the schema version', async function () {
				this.timeout(30000);
				for (const id of STATES) {
					const object = await harness.objects.getObjectAsync(`${ns}.${id}`);
					if (!object) {
						throw new Error(`state ${id} was not created`);
					}
				}
				await waitFor(async () => typeof (await read('info.dbVersion')) === 'number', 'info.dbVersion');
				if ((await read('info.dbVersion')) !== LATEST_SCHEMA_VERSION) {
					throw new Error(
						`info.dbVersion is ${await read('info.dbVersion')}, expected ${LATEST_SCHEMA_VERSION}`,
					);
				}
				if ((await read('info.connection')) !== true) {
					throw new Error('info.connection is not true after startup');
				}
				// the API answers on the configured port and says the same
				const health = await (await api('/api/health')).json();
				if (health.schemaVersion !== LATEST_SCHEMA_VERSION || health.status !== 'ok') {
					throw new Error(`unexpected health answer ${JSON.stringify(health)}`);
				}
			});

			it('creates a draft from control.createDraft and publishes its id', async function () {
				this.timeout(30000);
				await press('control.createDraft');
				const id = await waitFor(
					async () => (await read('control.lastDraftId')) || null,
					'control.lastDraftId',
				);
				const draft = await (await api(`/api/invoices/${id}`)).json();
				if (draft.status !== 'draft' || draft.number !== null) {
					throw new Error(`expected a numberless draft, got ${draft.status} / ${draft.number}`);
				}
				await waitFor(async () => (await read('info.draftCount')) >= 1, 'info.draftCount >= 1');
			});

			it('issues a draft from control.issueId and writes PDF and XML into the file mount', async function () {
				this.timeout(60000);
				const created = await postJson('/api/invoices', DRAFT);
				const draft = await created.json();
				await harness.states.setStateAsync(`${ns}.control.issueId`, { val: draft.id, ack: false });
				await press('control.issue');

				const number = await waitFor(
					async () => (await read('info.lastNumber')) || null,
					'info.lastNumber',
					45000,
				);
				const issued = await (await api(`/api/invoices/${draft.id}`)).json();
				if (issued.status !== 'issued' || issued.number !== number) {
					throw new Error(`expected issued ${number}, got ${issued.status} / ${issued.number}`);
				}
				// the artifacts went through the real ioBroker file API, not a test double
				const pdf = Buffer.from(await (await api(`/api/invoices/${draft.id}.pdf`)).arrayBuffer());
				if (pdf.subarray(0, 4).toString() !== '%PDF') {
					throw new Error('the stored PDF is not readable through the file mount');
				}
				const xml = await (await api(`/api/invoices/${draft.id}.xml`)).text();
				if (!xml.includes('CrossIndustryInvoice')) {
					throw new Error('the stored XML is not readable through the file mount');
				}
				await waitFor(async () => (await read('info.issuedCount')) >= 1, 'info.issuedCount >= 1');
			});

			it('backs up from control.backup and restores from control.restore with a safety copy', async function () {
				this.timeout(120000);
				await press('control.backup');
				const backupFile = await read('info.lastBackup');
				if (!backupFile) {
					throw new Error('info.lastBackup stayed empty after control.backup');
				}
				const issuedBefore = (await (await api('/api/health')).json()).counts.issued;

				// a second invoice after the backup: the restore will take it away again
				const draft = await (await postJson('/api/invoices', DRAFT)).json();
				const second = await (await postJson(`/api/invoices/${draft.id}/issue`, {})).json();
				if (second.status !== 'issued') {
					throw new Error('the second invoice was not issued');
				}

				// writing the text state must not run a command by itself (it used to)
				await harness.states.setStateAsync(`${ns}.control.restoreId`, {
					val: path.basename(String(backupFile)),
					ack: false,
				});
				await new Promise(resolve => setTimeout(resolve, 1000));
				if (harness.hasLog(/has to be type/)) {
					throw new Error('writing a text state ran a command and failed to acknowledge it');
				}
				if ((await (await api('/api/health')).json()).counts.issued !== issuedBefore + 1) {
					throw new Error('setting control.restoreId alone changed the data');
				}
				await press('control.restore');
				if ((await (await api('/api/health')).json()).counts.issued !== issuedBefore) {
					throw new Error('the restore did not bring the issued count back');
				}
				await waitFor(
					async () => (await read('info.issuedCount')) === issuedBefore,
					'info.issuedCount after the restore',
				);

				const list = await (await api('/api/backups')).json();
				if (!list.some(entry => String(entry.filename).includes('prerestore'))) {
					throw new Error('the restore did not keep a safety backup of the state before it');
				}
				// the number of the vanished invoice is not handed out again (H3)
				const draft3 = await (await postJson('/api/invoices', DRAFT)).json();
				const third = await (await postJson(`/api/invoices/${draft3.id}/issue`, {})).json();
				if (third.number === second.number) {
					throw new Error(`the number ${second.number} was issued twice`);
				}
			});

			it('refreshes the info states after a change through the API (PWA)', async function () {
				this.timeout(60000);
				const issuedBefore = (await (await api('/api/health')).json()).counts.issued;
				const draft = await (await postJson('/api/invoices', DRAFT)).json();
				const issued = await (await postJson(`/api/invoices/${draft.id}/issue`, {})).json();
				// no button was pressed: the states follow on their own
				await waitFor(
					async () => (await read('info.issuedCount')) === issuedBefore + 1,
					'info.issuedCount after an API issue',
				);
				// (info.lastNumber is not checked: there is no issue timestamp on the record, so "last" is
				// the first row in issue-date order — a known limitation, see ROADMAP §14)
				if (issued.status !== 'issued') {
					throw new Error('the invoice was not issued through the API');
				}
			});

			it('runs the automatic backup and keeps only the newest one, never touching a backup by hand', async function () {
				this.timeout(300000);
				const listed = async () => await (await api('/api/backups')).json();
				const autos = async () => (await listed()).filter(b => b.filename.includes('e-invoices-auto-'));
				const first = await waitFor(
					async () => (await autos())[0]?.filename ?? null,
					'the first automatic backup',
					200000,
				);
				const second = await waitFor(
					async () => {
						const found = (await autos())[0];
						return found && found.filename !== first ? found.filename : null;
					},
					'the second automatic backup',
					200000,
				);
				// the older one is deleted from the mount and from the log, the newest stays
				await waitFor(async () => (await autos()).length === 1, 'the old automatic backup to be pruned');
				const left = await autos();
				if (left[0].filename !== second) {
					throw new Error(`expected ${second} to be kept, got ${left[0].filename}`);
				}
				const gone = await api(`/api/backups/file/${path.basename(first)}`);
				if (gone.status !== 404) {
					throw new Error(`the pruned backup is still downloadable (${gone.status})`);
				}
				const kept = await api(`/api/backups/file/${path.basename(second)}`);
				if (kept.status !== 200) {
					throw new Error(`the kept backup cannot be downloaded (${kept.status})`);
				}
				// the backup made by hand with control.backup is still there
				if (!(await listed()).some(b => b.filename.includes('e-invoices-backup-'))) {
					throw new Error('the manual backup was deleted by the retention');
				}
				// with a current backup the warning state is empty
				await waitFor(async () => (await read('info.backupWarning')) === '', 'info.backupWarning to be empty');
				const status = await (await api('/api/backups/status')).json();
				if (status.warning !== null || status.keep !== 1 || status.intervalMinutes !== 1) {
					throw new Error(`unexpected backup status ${JSON.stringify(status)}`);
				}
			});

			it('stops cleanly, frees the port and starts again with the same data', async function () {
				this.timeout(120000);
				const before = await (await api('/api/health')).json();
				await harness.stopAdapter();
				await waitFor(async () => harness.didAdapterStop(), 'the adapter to stop', 30000);
				// no error on the way down and the socket is released at once (no timer or server left behind)
				const errors = harness.getLogs('error');
				if (errors.length > 0) {
					throw new Error(`the adapter logged errors: ${errors.map(e => e.message).join(' | ')}`);
				}
				if (!(await portIsFree(PORT))) {
					throw new Error(`port ${PORT} is still in use after the adapter stopped`);
				}

				// the connection flag has to say "down" once the adapter is gone
				const connection = await read('info.connection');
				if (connection !== false) {
					throw new Error(`info.connection is ${String(connection)} after the adapter stopped`);
				}

				// the controller still lists the old process as alive for a moment; a start before that ends exits with
				// ADAPTER_ALREADY_RUNNING (code 7)
				await waitFor(
					async () => (await harness.states.getStateAsync(`system.adapter.${ns}.alive`))?.val !== true,
					'the old process to be gone from the controller',
				);
				// the harness refuses a second start ("already been used"); a restart is exactly what is tested here
				harness._adapterExit = undefined;
				await harness.startAdapterAndWait(false);
				await waitFor(
					async () => (await read('info.connection')) === true,
					'info.connection after the restart',
				);
				const after = await (await api('/api/health')).json();
				if (JSON.stringify(after.counts) !== JSON.stringify(before.counts)) {
					throw new Error(
						`the data changed over a restart: ${JSON.stringify(before.counts)} -> ${JSON.stringify(after.counts)}`,
					);
				}
			});
		});
	},
});
