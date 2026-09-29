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
import { blankDraft, DEFAULT_NUMBER_FORMAT, normalizeNumberFormat } from './lib/invoice-model';
import { collectReminderCandidates, issueInvoiceWithArtifacts } from './lib/issue-service';

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
	/** Pending automatic backup, cancelled on unload. */
	private backupTimer: NodeJS.Timeout | undefined;
	/** Pending automatic dunning check, cancelled on unload. */
	private reminderTimer: NodeJS.Timeout | undefined;

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
			this.applyNumberFormat();
			const defaultTemplate = this.db.ensureDefaultTemplate();
			this.log.info(`Layout template: ${defaultTemplate.name} v${defaultTemplate.version}`);
			this.syncCompanyFromConfig();
			await this.ensureObjects();
			await this.ensureMountPoint();
			await this.publishStatusFile();
			await this.refreshStats();
			await this.refreshOverdue();

			this.subscribeStates('control.*');
			this.startApiServer();
			this.startBackupTimer();
			this.startReminderTimer();
			await this.setState('info.connection', true, true);
			this.log.info('e-invoices started: drafts, issue flow and status file are ready.');
		} catch (error) {
			this.log.error(`Startup failed: ${(error as Error).message}`);
			await this.setState('info.connection', false, true);
		}
	}

	/**
	 * Validates the configured invoice number format once and warns loudly if
	 * it is unusable, so the fallback to the default is never silent.
	 */
	private applyNumberFormat(): void {
		const raw = typeof this.config.numberFormat === 'string' ? this.config.numberFormat : '';
		const validated = normalizeNumberFormat(raw);
		if (raw.trim() !== '' && !validated) {
			this.log.warn(
				`Invoice number format "${raw.trim()}" is unusable (needs {SEQ} and may only use {YYYY}, {EMPLOYEE}, {SEQ} plus separators) — falling back to ${DEFAULT_NUMBER_FORMAT}`,
			);
		}
		this.db?.applyOptions({ numberFormat: raw });
	}

	/**
	 * Mirrors the company master data from the instance config into the
	 * default company profile. Only non-empty config values overwrite, so a
	 * profile edited in the PWA keeps its data as long as the field is left
	 * empty here.
	 */
	private syncCompanyFromConfig(): void {
		if (!this.db) {
			return;
		}
		const current = this.db.getDefaultCompanyProfile();
		if (!current) {
			return;
		}
		const str = (key: string): string => {
			const value = (this.config as unknown as Record<string, unknown>)[key];
			return typeof value === 'string' ? value.trim() : '';
		};
		const merged: Record<string, unknown> = { ...current.profile };
		const map: Record<string, string> = {
			name: str('companyName'),
			street: str('companyStreet'),
			zip: str('companyZip'),
			city: str('companyCity'),
			country: str('companyCountry'),
			vatId: str('vatId'),
			taxNumber: str('taxNumber'),
			email: str('companyEmail'),
			iban: str('iban'),
			bic: str('bic'),
			website: str('website'),
		};
		let changed = false;
		for (const [field, value] of Object.entries(map)) {
			if (value !== '' && merged[field] !== value) {
				merged[field] = value;
				changed = true;
			}
		}
		if (!changed) {
			return;
		}
		const name = (typeof merged.name === 'string' ? merged.name.trim() : '') || current.name;
		this.db.updateCompanyProfile(current.id, { name, profile: merged as unknown as typeof current.profile });
		this.log.info(`Company profile "${name}" updated from the instance config.`);
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
				id: 'info.overdueCount',
				common: {
					name: 'Overdue unpaid invoices',
					type: 'number',
					role: 'value',
					read: true,
					write: false,
					def: 0,
				},
				native: {},
			},
			{
				id: 'info.overdueList',
				common: {
					name: 'Overdue invoices as JSON (number, customer, days, level)',
					type: 'string',
					role: 'text',
					read: true,
					write: false,
				},
				native: {},
			},
			{
				id: 'info.lastReminderCheck',
				common: { name: 'Last dunning check', type: 'string', role: 'text', read: true, write: false },
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
			return;
		}
		// an explicitly configured mount wins, but only when it really exists
		const configured = typeof this.config.storageMount === 'string' ? this.config.storageMount.trim() : '';
		if (configured === '') {
			return;
		}
		try {
			const target = await this.getForeignObjectAsync(configured);
			if (!target) {
				this.log.warn(
					`Storage mount "${configured}" does not exist — falling back to the own directory ${this.mountId}. Check the name in the instance config.`,
				);
				return;
			}
			// a meta or folder object is a usable file mount, a state is not
			if (
				target.type !== 'meta' &&
				target.type !== 'folder' &&
				target.type !== 'channel' &&
				target.type !== 'device'
			) {
				this.log.warn(
					`Object "${configured}" is a ${target.type}, not a file mount — keeping ${this.namespace}.${MOUNT_POINT}.`,
				);
				return;
			}
			this.mountId = configured;
			this.log.info(`Invoice files are stored on the mount ${this.mountId}.`);
		} catch (error) {
			this.log.warn(
				`Storage mount "${configured}" is not usable (${(error as Error).message}) — keeping ${this.namespace}.${MOUNT_POINT}.`,
			);
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
				await this.runBackup();
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
	 * Creates one backup and records it in the backup log.
	 */
	private async runBackup(): Promise<void> {
		if (!this.db) {
			throw new Error('Database is not ready');
		}
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
	}

	/**
	 * Starts the automatic backup as a setTimeout chain (never a fixed cron
	 * second) and keeps a handle so `onUnload` can cancel it. Interval 0 or
	 * missing means off.
	 */
	private startBackupTimer(): void {
		this.stopBackupTimer();
		const minutes = Number(this.config.backupIntervalMinutes);
		if (!Number.isFinite(minutes) || minutes <= 0) {
			return;
		}
		const delay = Math.min(Math.max(Math.round(minutes * 60_000), 60_000), 7 * 24 * 60 * 60_000);
		const schedule = (): void => {
			this.backupTimer = setTimeout(() => {
				void this.runBackup()
					.catch((error: Error) => this.log.error(`Automatic backup failed: ${error.message}`))
					.finally(schedule);
			}, delay);
			// must not hold the event loop on stop
			this.backupTimer.unref?.();
		};
		this.log.info(`Automatic backup every ${Math.round(delay / 60_000)} min into ${this.mountId}.`);
		schedule();
	}

	/** Cancels a pending automatic backup. */
	private stopBackupTimer(): void {
		if (this.backupTimer) {
			clearTimeout(this.backupTimer);
			this.backupTimer = undefined;
		}
	}

	/**
	 * Starts the dunning check as a setTimeout chain, mirroring the backup.
	 *
	 * The adapter never mails anybody: it only recomputes which issued
	 * invoices are overdue and publishes them as `info.overdue*`. Reminding
	 * the customer stays a deliberate act of the user, which is also what the
	 * legal assessment of a dunning process expects.
	 */
	private startReminderTimer(): void {
		this.stopReminderTimer();
		const hours = Number(this.config.reminderCheckHours);
		if (!Number.isFinite(hours) || hours <= 0) {
			return;
		}
		const delay = Math.min(Math.max(Math.round(hours * 3_600_000), 60_000), 7 * 24 * 3_600_000);
		const schedule = (): void => {
			this.reminderTimer = setTimeout(() => {
				void this.refreshOverdue()
					.catch((error: Error) => this.log.error(`Dunning check failed: ${error.message}`))
					.finally(schedule);
			}, delay);
			// must not hold the event loop on stop
			this.reminderTimer.unref?.();
		};
		this.log.info(`Dunning check every ${Math.round(delay / 3_600_000)} h.`);
		schedule();
	}

	/** Cancels a pending dunning check. */
	private stopReminderTimer(): void {
		if (this.reminderTimer) {
			clearTimeout(this.reminderTimer);
			this.reminderTimer = undefined;
		}
	}

	/**
	 * Recomputes the overdue list and publishes it to the info.* states, so a
	 * dashboard can show it without opening the PWA.
	 */
	private async refreshOverdue(): Promise<void> {
		// The timer is cancelled on unload, but an in-flight check must not
		// touch a database that is already closed.
		if (!this.db) {
			return;
		}
		const candidates = collectReminderCandidates(this.db);
		await this.setState('info.overdueCount', candidates.length, true);
		await this.setState(
			'info.overdueList',
			JSON.stringify(
				candidates.map(c => ({
					number: c.invoice.number,
					customer: c.invoice.buyer.name,
					days: c.overdueDays,
					level: c.level,
					skonto: c.skontoActive,
				})),
			),
			true,
		);
		await this.setState('info.lastReminderCheck', new Date().toISOString(), true);
		if (candidates.length > 0) {
			this.log.info(
				`${candidates.length} issued invoice(s) overdue, oldest ${candidates[0].overdueDays} days. Open the PWA to remind.`,
			);
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
				settings: {
					defaultVatRate: Number(this.config.defaultVatRate ?? 19),
					defaultPaymentTerms: this.config.defaultPaymentTerms ?? '',
					numberFormat: this.db?.effectiveNumberFormat() ?? DEFAULT_NUMBER_FORMAT,
					storageMount: this.mountId,
					backupIntervalMinutes: Number(this.config.backupIntervalMinutes ?? 0),
				},
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
			this.stopBackupTimer();
			this.stopReminderTimer();
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
