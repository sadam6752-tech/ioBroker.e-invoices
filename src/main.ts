/*
 * Created with @iobroker/create-adapter v3.1.5
 * P2: database lifecycle, info/control states, file mountpoint and commands.
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import { version as adapterVersion } from '../package.json';
import { attachStatic, createApiServer } from './lib/api-server';
import { createBackup, restoreBackup } from './lib/backup';
import { InvoiceDatabase } from './lib/db';
import { blankDraft } from './lib/invoice-model';
import { issueInvoiceWithArtifacts } from './lib/issue-service';

const MOUNT_POINT = 'storage';
const STATUS_FILE = 'status.json';
/** Fallback PWA/API port when the instance config has none (admin UI in P6+). */
const DEFAULT_API_PORT = 8093;
/** Fallback bind address (loopback: the API is unauthenticated by default). */
const DEFAULT_API_BIND = '127.0.0.1';

class EInvoices extends utils.Adapter {
	private db: InvoiceDatabase | null = null;
	private mountId = '';
	private filesAvailable = false;
	private server: Server | null = null;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'e-invoices',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.mountId = `${this.namespace}.${MOUNT_POINT}`;
		await this.setState('info.connection', false, true);

		try {
			const dbPath = join(utils.getAbsoluteInstanceDataDir(this), 'invoices.db');
			this.db = new InvoiceDatabase(dbPath);
			this.db.migrate();
			this.log.info(`Database ready (schema v${this.db.currentVersion()}): ${dbPath}`);
			const defaultTemplate = this.db.ensureDefaultTemplate();
			this.log.info(`Layout template: ${defaultTemplate.name} v${defaultTemplate.version}`);
			const company = this.db.ensureDefaultCompanyProfile();
			this.log.info(`Company profile: ${company.name}`);

			await this.ensureObjects();
			await this.ensureMountPoint();
			await this.publishStatusFile();
			await this.refreshStats();

			this.subscribeStates('control.*');
			this.startApiServer();
			await this.setState('info.connection', true, true);
			this.log.info('e-invoices started: drafts, issue flow and status file are ready.');
		} catch (error) {
			this.log.error(`Startup failed: ${(error as Error).message}`);
			await this.setState('info.connection', false, true);
		}
	}

	/**
	 * Creates the info/control states (idempotent, also heals older installs).
	 */
	private async ensureObjects(): Promise<void> {
		await this.setObjectNotExistsAsync('control', {
			type: 'channel',
			common: { name: 'Control commands' },
			native: {},
		});

		const states: { id: string; common: ioBroker.StateCommon; native: Record<string, unknown> }[] = [
			{
				id: 'info.invoiceCount',
				common: { name: 'Total invoices', type: 'number', role: 'value', read: true, write: false, def: 0 },
				native: {},
			},
			{
				id: 'info.draftCount',
				common: { name: 'Draft invoices', type: 'number', role: 'value', read: true, write: false, def: 0 },
				native: {},
			},
			{
				id: 'info.issuedCount',
				common: { name: 'Issued invoices', type: 'number', role: 'value', read: true, write: false, def: 0 },
				native: {},
			},
			{
				id: 'info.lastNumber',
				common: { name: 'Last issued number', type: 'string', role: 'text', read: true, write: false },
				native: {},
			},
			{
				id: 'info.lastIssuedAt',
				common: { name: 'Last issue timestamp', type: 'string', role: 'text', read: true, write: false },
				native: {},
			},
			{
				id: 'info.dbVersion',
				common: {
					name: 'Database schema version',
					type: 'number',
					role: 'value',
					read: true,
					write: false,
					def: 0,
				},
				native: {},
			},
			{
				id: 'info.lastBackup',
				common: { name: 'Last backup filename', type: 'string', role: 'text', read: true, write: false },
				native: {},
			},
			{
				id: 'control.createDraft',
				common: {
					name: 'Create empty draft',
					type: 'boolean',
					role: 'button',
					read: false,
					write: true,
					def: false,
				},
				native: {},
			},
			{
				id: 'control.lastDraftId',
				common: { name: 'Last created draft id', type: 'string', role: 'text', read: true, write: false },
				native: {},
			},
			{
				id: 'control.issueId',
				common: { name: 'Draft id to issue', type: 'string', role: 'text', read: true, write: true },
				native: {},
			},
			{
				id: 'control.issue',
				common: {
					name: 'Issue draft from issueId',
					type: 'boolean',
					role: 'button',
					read: false,
					write: true,
					def: false,
				},
				native: {},
			},
			{
				id: 'control.refresh',
				common: {
					name: 'Refresh stats and status file',
					type: 'boolean',
					role: 'button',
					read: false,
					write: true,
					def: false,
				},
				native: {},
			},
			{
				id: 'control.backup',
				common: {
					name: 'Create backup now',
					type: 'boolean',
					role: 'button',
					read: false,
					write: true,
					def: false,
				},
				native: {},
			},
			{
				id: 'control.restoreId',
				common: { name: 'Backup filename to restore', type: 'string', role: 'text', read: true, write: true },
				native: {},
			},
			{
				id: 'control.restore',
				common: {
					name: 'Restore backup from restoreId',
					type: 'boolean',
					role: 'button',
					read: false,
					write: true,
					def: false,
				},
				native: {},
			},
		];

		for (const state of states) {
			await this.setObjectNotExistsAsync(state.id, {
				type: 'state',
				common: state.common,
				native: state.native,
			});
		}
	}

	/**
	 * Files are user data (invoices, logos, backups) and must survive
	 * ioBroker backups — hence `meta.user`, never below the namespace.
	 */
	private async ensureMountPoint(): Promise<void> {
		try {
			await this.setObjectNotExistsAsync(this.mountId, {
				type: 'meta',
				common: { name: 'File storage', type: 'meta.user' },
				native: {},
			});
			this.filesAvailable = true;
		} catch (error) {
			this.filesAvailable = false;
			this.log.error(`Cannot create file mount point ${this.mountId}: ${(error as Error).message}`);
		}
	}

	/**
	 * Publishes adapter/DB stats as JSON into the file mountpoint.
	 * Own try/catch so file errors never look like state errors.
	 */
	private async publishStatusFile(): Promise<void> {
		if (!this.db || !this.filesAvailable) {
			return;
		}
		const counts = this.db.countByStatus();
		const last = this.db.listInvoices({ status: 'issued', limit: 1 });
		const payload = {
			adapter: 'e-invoices',
			instance: this.namespace,
			time: new Date().toISOString(),
			schemaVersion: this.db.currentVersion(),
			counts,
			lastNumber: last[0]?.number ?? null,
		};
		try {
			await this.writeFileAsync(this.mountId, STATUS_FILE, JSON.stringify(payload, null, 2));
			this.log.info(`Status file published: ${this.mountId}/${STATUS_FILE}`);
		} catch (error) {
			this.log.error(`Cannot write status file ${STATUS_FILE}: ${(error as Error).message}`);
		}
	}

	/**
	 * Refreshes the info.* states from the database.
	 */
	private async refreshStats(): Promise<void> {
		if (!this.db) {
			return;
		}
		const counts = this.db.countByStatus();
		await this.setState('info.invoiceCount', counts.draft + counts.issued + counts.cancelled, true);
		await this.setState('info.draftCount', counts.draft, true);
		await this.setState('info.issuedCount', counts.issued, true);
		await this.setState('info.dbVersion', this.db.currentVersion(), true);
		const last = this.db.listInvoices({ status: 'issued', limit: 1 });
		await this.setState('info.lastNumber', last[0]?.number ?? '', true);
		await this.setState('info.lastIssuedAt', last[0]?.updatedAt ?? '', true);
	}

	/**
	 * Handles control.* button commands (each ack:false write triggers once).
	 *
	 * @param id - Full state id of the pressed button.
	 */
	private async handleCommand(id: string): Promise<void> {
		try {
			if (!this.db) {
				throw new Error('Database is not ready');
			}
			if (id === `${this.namespace}.control.createDraft`) {
				const created = this.db.createDraft(blankDraft());
				await this.setState('control.lastDraftId', created.id, true);
				this.log.info(`Draft created: ${created.id}`);
				await this.refreshStats();
			} else if (id === `${this.namespace}.control.issue`) {
				const idState = await this.getStateAsync('control.issueId');
				const targetId = String(idState?.val ?? '').trim();
				if (!targetId) {
					throw new Error('control.issueId is empty — set a draft id first');
				}
				const outcome = await issueInvoiceWithArtifacts(this.db, this.log, targetId, {
					write: this.storageWriter,
					read: this.storageReader,
				});
				await this.setState('control.lastDraftId', outcome.invoice.id, true);
				await this.refreshStats();
				await this.publishStatusFile();
			} else if (id === `${this.namespace}.control.refresh`) {
				await this.refreshStats();
				await this.publishStatusFile();
			} else if (id === `${this.namespace}.control.backup`) {
				const backup = await createBackup(this.db, { read: this.storageReader }, this.log, adapterVersion);
				await this.writeFileAsync(this.mountId, backup.filename, backup.data);
				this.db.logBackup({
					filename: backup.filename,
					size: backup.size,
					sha256: backup.sha256,
					manifestJson: JSON.stringify(backup.manifest),
				});
				await this.setState('info.lastBackup', backup.filename, true);
				this.log.info(`Backup finished: ${backup.filename}`);
				await this.publishStatusFile();
			} else if (id === `${this.namespace}.control.restore`) {
				const idState = await this.getStateAsync('control.restoreId');
				const name =
					String(idState?.val ?? '')
						.split('/')
						.pop() ?? '';
				if (!name) {
					throw new Error('control.restoreId is empty — set a backup filename first');
				}
				const data = await this.storageReader(`backups/${name.replace(/[^A-Za-z0-9_.-]/g, '')}`);
				const summary = await restoreBackup(
					this.db,
					{ write: this.storageWriter, read: this.storageReader },
					data,
					this.log,
				);
				this.log.info(`Restore finished: ${summary.invoices} invoices, ${summary.filesWritten.length} files`);
				await this.refreshStats();
				await this.publishStatusFile();
			}
			await this.setState(id, { val: true, ack: true });
		} catch (error) {
			this.log.error(`Command ${id} failed: ${(error as Error).message}`);
			await this.setState(id, { val: true, ack: true });
		}
	}

	/**
	 * Mountpoint file writer (bound for the issue flow and API).
	 *
	 * @param relPath - Path below the storage mountpoint.
	 * @param data - File content.
	 */
	private storageWriter = async (relPath: string, data: string | Buffer): Promise<void> => {
		await this.writeFileAsync(this.mountId, relPath, data);
	};

	/**
	 * Mountpoint file reader (bound for the issue flow and API).
	 *
	 * @param relPath - Path below the storage mountpoint.
	 */
	private storageReader = async (relPath: string): Promise<Buffer> => {
		const result = (await this.readFileAsync(this.mountId, relPath)) as unknown as
			{ file: Buffer | string } | Buffer | string;
		const content =
			typeof result === 'object' && result !== null && 'file' in result && !Buffer.isBuffer(result)
				? result.file
				: result;
		return Buffer.isBuffer(content) ? content : Buffer.from(content);
	};

	/**
	 * Starts the PWA/API HTTP server on its own port (compact:false, own
	 * socket for the PWA — see README for the W5049 reason).
	 */
	private startApiServer(): void {
		if (!this.db) {
			return;
		}
		try {
			const app = createApiServer({
				db: this.db,
				storage: { write: this.storageWriter, read: this.storageReader },
				log: this.log,
				version: adapterVersion,
				authToken: this.config.authToken || undefined,
			});
			const wwwDir = join(__dirname, '../www');
			if (attachStatic(app, wwwDir)) {
				this.log.info(`PWA bundle served from ${wwwDir}`);
			} else {
				this.log.info('No PWA bundle yet (www/ missing) — API only');
			}
			const port = this.config.port || DEFAULT_API_PORT;
			const bind = this.config.bind || DEFAULT_API_BIND;
			this.server = createServer(app);
			this.server.on('error', (error: Error) => {
				this.log.error(`API server error (port ${port}): ${error.message}`);
			});
			this.server.listen(port, bind, () => {
				this.log.info(`API+PWA listening on ${bind}:${port}`);
				if (!this.config.authToken) {
					this.log.warn(
						`No API token set — every client that can reach ${bind}:${port} may read, issue and RESTORE invoices. Set authToken in the instance config or bind to 127.0.0.1.`,
					);
				}
				if (bind !== '127.0.0.1' && bind !== 'localhost' && !this.config.authToken) {
					this.log.warn(`Unauthenticated API is bound to ${bind} (reachable from the network).`);
				}
			});
		} catch (error) {
			this.log.error(`Cannot start API server: ${(error as Error).message}`);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
			try {
				this.server?.close();
			} catch (error) {
				this.log.error(`Error stopping API server: ${(error as Error).message}`);
			}
			this.server = null;
			try {
				this.db?.close();
			} catch (error) {
				this.log.error(`Error closing database: ${(error as Error).message}`);
			}
			this.db = null;
			void this.setState('info.connection', false, true);

			callback();
		} catch (error) {
			this.log.error(`Error during unloading: ${(error as Error).message}`);
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  */
	// private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 *
	 * @param id - State ID
	 * @param state - State object
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state && state.ack === false && id.startsWith(`${this.namespace}.control.`)) {
			void this.handleCommand(id);
		}
	}
	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	//
	// private onMessage(obj: ioBroker.Message): void {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');
	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }
}
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new EInvoices(options);
} else {
	// otherwise start the instance directly
	(() => new EInvoices())();
}
