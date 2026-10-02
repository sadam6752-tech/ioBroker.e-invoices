/**
 * Backup and restore for ioBroker.e-invoices (P5).
 *
 * A backup ZIP contains:
 * - manifest.json (app id, format version, counts, per-file SHA-256)
 * - dump.json (full database content, attachments as base64)
 * - files/<path> (PDF/XML/XLSX/logos from the mountpoint)
 *
 * Restore verifies the manifest first, replaces the database in one
 * transaction and rewrites the files afterwards (each with its own
 * try/catch, failures are reported, not hidden).
 */
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import type { InvoiceDatabase, DatabaseDump } from './db';
import { LATEST_SCHEMA_VERSION } from './migrations';

/** App id stamped into every manifest. */
export const BACKUP_APP_ID = 'ioBroker.e-invoices';

/** Backup format version. */
export const BACKUP_FORMAT_VERSION = 1;

/** One file listed in the manifest. */
export interface BackupManifestFile {
	/** Path inside files/ and on the mountpoint. */
	path: string;
	/** Size in bytes. */
	size: number;
	/** SHA-256 hex of the file content. */
	sha256: string;
}

/** Backup manifest content. */
export interface BackupManifest {
	/** Always ioBroker.e-invoices. */
	app: string;
	/** Backup format version. */
	formatVersion: number;
	/** Creation timestamp. */
	createdAt: string;
	/** Adapter version that wrote the backup. */
	adapterVersion: string;
	/** DB schema version at export. */
	schemaVersion: number;
	/** Entity counts. */
	counts: { invoices: number; templates: number; attachments: number; customers: number; files: number };
	/** Files with hashes. */
	files: BackupManifestFile[];
	/** SHA-256 hex of dump.json, the payload that actually replaces the database. */
	dumpSha256?: string;
}

/** Created backup (ZIP bytes + metadata). */
export interface BackupResult {
	/** Mountpoint filename, e.g. backups/e-invoices-2026-....zip. */
	filename: string;
	/** ZIP size in bytes. */
	size: number;
	/** SHA-256 hex of the ZIP. */
	sha256: string;
	/** Manifest. */
	manifest: BackupManifest;
	/** ZIP bytes. */
	data: Buffer;
}

/** Restore outcome. */
export interface RestoreSummary {
	/** Manifest of the restored backup. */
	manifest: BackupManifest;
	/** Imported invoices. */
	invoices: number;
	/** Imported templates. */
	templates: number;
	/** Rewritten files. */
	filesWritten: string[];
	/** Files that failed with reasons. */
	fileErrors: string[];
	/** Backup of the state before the restore (mountpoint path). */
	safetyBackup: string | null;
	/** Counters that stayed higher than in the backup, so no number is issued twice. */
	countersKept: string[];
}

/** Minimal logger shape (adapter log compatible). */
export interface BackupLogger {
	/** Info message. */
	info(message: string): void;
	/** Error message. */
	error(message: string): void;
}

/** File backend (mountpoint in prod, memory in tests). */
export interface BackupStorage {
	/** Write a file. */
	write(relPath: string, data: string | Buffer): Promise<void>;
	/** Read a file. */
	read(relPath: string): Promise<Buffer>;
}

function sha256Hex(data: Buffer | string): string {
	return createHash('sha256').update(data).digest('hex');
}

/**
 * Rejects backup entry paths that would escape the storage root
 * (zip slip: `../`, absolute paths, Windows drive letters, backslashes).
 *
 * @param relPath - Path taken from the backup manifest.
 */
function assertSafeEntryPath(relPath: unknown): asserts relPath is string {
	if (typeof relPath !== 'string' || relPath.trim() === '') {
		throw new Error('Backup manifest contains an invalid file path');
	}
	if (relPath.includes('\\') || relPath.startsWith('/') || /^[A-Za-z]:/.test(relPath)) {
		throw new Error(`Backup manifest contains an unsafe file path: ${relPath}`);
	}
	for (const segment of relPath.split('/')) {
		if (segment === '..' || segment === '' || segment === '.') {
			throw new Error(`Backup manifest contains an unsafe file path: ${relPath}`);
		}
	}
}

/** Hard limits for restore input, so a crafted ZIP cannot exhaust memory (R3). */
export interface BackupLimits {
	/** Maximum size of the incoming ZIP in bytes. */
	zipBytes: number;
	/** Maximum sum of all uncompressed bytes in the ZIP. */
	unpackedBytes: number;
	/** Maximum number of entries in the ZIP. */
	entries: number;
	/** Maximum size of the single `dump.json` payload. */
	dumpBytes: number;
}

/** Production limits: a 512 MB ZIP may expand to at most 1 GB. */
export const DEFAULT_BACKUP_LIMITS: BackupLimits = {
	zipBytes: 512 * 1024 * 1024,
	unpackedBytes: 1024 * 1024 * 1024,
	entries: 20000,
	dumpBytes: 256 * 1024 * 1024,
};

/**
 * Merges caller limits with the production defaults.
 *
 * @param limits - Optional overrides (used by tests).
 */
function resolveLimits(limits?: Partial<BackupLimits>): BackupLimits {
	return { ...DEFAULT_BACKUP_LIMITS, ...(limits ?? {}) };
}

/**
 * Uncompressed size as declared in the ZIP directory, when JSZip exposes it.
 * Optional by design — the running total while extracting is the hard guard.
 *
 * @param entry - ZIP entry (or null when the name does not exist).
 */
function declaredSize(entry: JSZip.JSZipObject | null): number | undefined {
	const data = (entry as unknown as { _data?: { uncompressedSize?: number } } | null)?._data;
	return typeof data?.uncompressedSize === 'number' ? data.uncompressedSize : undefined;
}

function stampName(date = new Date()): string {
	return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Collects artifact paths referenced by the database content.
 *
 * @param dump - Exported database content.
 */
export function collectArtifactPaths(dump: DatabaseDump): string[] {
	const paths = new Set<string>();
	for (const invoice of dump.invoices) {
		if (invoice.pdfPath) {
			paths.add(invoice.pdfPath);
		}
		if (invoice.xlsxPath) {
			paths.add(invoice.xlsxPath);
		}
		if (invoice.number) {
			paths.add(`invoices/${invoice.issueDate.slice(0, 4)}/${invoice.number}.xml`);
		}
	}
	for (const template of dump.templates) {
		if (template.definition.logo?.path) {
			paths.add(template.definition.logo.path);
		}
	}
	return [...paths];
}

interface DumpJsonAttachment {
	/** Row id (kept for traceability, reinserted without id). */
	id: number;
	/** Owning invoice UUID. */
	invoiceId: string;
	/** Original filename. */
	filename: string;
	/** MIME type. */
	mime: string;
	/** Size in bytes. */
	size: number;
	/** Base64 content. */
	dataBase64: string;
	/** Creation timestamp. */
	createdAt: string;
}

/**
 * Creates a backup ZIP from the database and the file backend.
 *
 * @param db - Open invoice database.
 * @param storage - File backend for reading artifacts.
 * @param log - Logger.
 * @param adapterVersion - Adapter version for the manifest.
 */
export async function createBackup(
	db: InvoiceDatabase,
	storage: Pick<BackupStorage, 'read'>,
	log: BackupLogger,
	adapterVersion: string,
): Promise<BackupResult> {
	const dump = db.exportData();
	const dumpJson = {
		...dump,
		attachments: dump.attachments.map((attachment): DumpJsonAttachment => ({
			id: attachment.id,
			invoiceId: attachment.invoiceId,
			filename: attachment.filename,
			mime: attachment.mime,
			size: attachment.size,
			dataBase64: attachment.data.toString('base64'),
			createdAt: attachment.createdAt,
		})),
	};

	const zip = new JSZip();
	const files: BackupManifestFile[] = [];
	for (const path of collectArtifactPaths(dump)) {
		try {
			const data = await storage.read(path);
			zip.file(`files/${path}`, data);
			files.push({ path, size: data.length, sha256: sha256Hex(data) });
		} catch (error) {
			log.error(`Backup skips unreadable file ${path}: ${(error as Error).message}`);
		}
	}
	const dumpJsonText = JSON.stringify(dumpJson, null, 2);
	zip.file('dump.json', dumpJsonText);
	const manifest: BackupManifest = {
		app: BACKUP_APP_ID,
		formatVersion: BACKUP_FORMAT_VERSION,
		createdAt: new Date().toISOString(),
		adapterVersion,
		schemaVersion: dump.schemaVersion,
		counts: {
			invoices: dump.invoices.length,
			templates: dump.templates.length,
			attachments: dump.attachments.length,
			customers: dump.customers.length,
			files: files.length,
		},
		files,
		dumpSha256: sha256Hex(dumpJsonText),
	};
	zip.file('manifest.json', JSON.stringify(manifest, null, 2));
	const data = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
	const filename = `backups/e-invoices-backup-${stampName()}.zip`;
	return { filename, size: data.length, sha256: sha256Hex(data), manifest, data };
}

/** What a restore would change, without touching anything. */
export interface RestorePreview {
	/** Manifest of the inspected backup. */
	manifest: BackupManifest;
	/** Invoice count in the backup. */
	invoices: number;
	/** Issued invoices among them. */
	issued: number;
	/** Invoice numbers carried by the backup. */
	numbers: string[];
	/** Template count. */
	templates: number;
	/** Customer count. */
	customers: number;
	/** Product count. */
	products: number;
	/** Company profile count. */
	companies: number;
	/** Invoice count currently in the database. */
	currentInvoices: number;
	/** Numbers that would be overwritten by this backup. */
	overwritten: string[];
	/** Numbers that only exist here and would be new. */
	added: string[];
	/** Numbers that exist only in the current database and would be removed from it. */
	onlyHere: string[];
	/** Counters that are ahead of the backup (they are kept, numbers are never reused). */
	counterAhead: string[];
	/** Files that would be written. */
	filesWritten: number;
}

/**
 * Inspects a backup ZIP without writing anything.
 *
 * A restore replaces the whole database, so the user should see exactly what
 * would change before confirming. Every integrity check of the real restore
 * runs here as well, so a broken backup is rejected in the preview and never
 * half-applied.
 *
 * @param db - Open invoice database (read-only use).
 * @param zipData - Backup ZIP bytes.
 * @param limits - Optional ZIP limits (defaults to the production caps).
 * @returns Counts and the diff against the current state.
 * @throws {Error} When the ZIP, manifest, checksums or schema are not usable.
 */
export async function previewRestore(
	db: InvoiceDatabase,
	zipData: Buffer,
	limits?: Partial<BackupLimits>,
): Promise<RestorePreview> {
	const { manifest, dump } = await readAndVerifyBackup(zipData, limits);
	const numbers = dump.invoices.map(i => i.number).filter((n): n is string => Boolean(n));
	const currentNumbers = new Set(
		db
			.allInvoices()
			.map(i => i.number)
			.filter(Boolean) as string[],
	);
	return {
		manifest,
		invoices: dump.invoices.length,
		issued: dump.invoices.filter(i => i.status === 'issued').length,
		numbers,
		templates: dump.templates.length,
		customers: dump.customers.length,
		products: dump.products.length,
		companies: dump.companies.length,
		currentInvoices: db.allInvoices().length,
		overwritten: numbers.filter(n => currentNumbers.has(n)),
		added: numbers.filter(n => !currentNumbers.has(n)),
		filesWritten: (manifest.files ?? []).length,
		onlyHere: [...currentNumbers].filter(n => !numbers.includes(n)),
		counterAhead: mergeCounters(dump.counters, db.exportData().counters).raised,
	};
}

/**
 * Raises the counters of a backup to the current ones where those are higher.
 *
 * A restore may bring back an older state, but a number that was handed out
 * once must never be handed out again (§ 14 Abs. 4 Nr. 4 UStG, GoBD): its
 * PDF/XML may still lie on the mountpoint and would be overwritten.
 *
 * @param fromBackup - Counters of the backup dump.
 * @param current - Counters of the running database.
 * @returns The merged counters and a readable list of those that were raised.
 */
function mergeCounters(
	fromBackup: DatabaseDump['counters'],
	current: DatabaseDump['counters'],
): { counters: DatabaseDump['counters']; raised: string[] } {
	const key = (c: { year: number; employee?: string; doc_type?: string }): string =>
		`${c.year}/${c.employee ?? '00'}/${c.doc_type ?? 'invoice'}`;
	const merged = new Map<string, DatabaseDump['counters'][number]>();
	for (const counter of fromBackup ?? []) {
		merged.set(key(counter), counter);
	}
	const raised: string[] = [];
	for (const counter of current) {
		const existing = merged.get(key(counter));
		if (!existing || existing.last_seq < counter.last_seq) {
			merged.set(key(counter), counter);
			raised.push(`${key(counter)} (backup ${existing?.last_seq ?? 0}, kept ${counter.last_seq})`);
		}
	}
	return { counters: [...merged.values()], raised };
}

/**
 * Opens a backup ZIP and verifies it completely: structure, application id,
 * format version, schema compatibility, per-file checksums and the dump
 * checksum. Shared by the preview and the real restore, so a broken backup
 * can never be half applied.
 *
 * @param zipData - Backup ZIP bytes.
 * @param limits - Optional ZIP limits (defaults to the production caps).
 * @returns The verified manifest, the parsed database dump and the verified files.
 * @throws {Error} When anything about the archive is unusable.
 */
async function readAndVerifyBackup(
	zipData: Buffer,
	limits?: Partial<BackupLimits>,
): Promise<{ manifest: BackupManifest; dump: DatabaseDump; files: { path: string; data: Buffer }[] }> {
	const caps = resolveLimits(limits);
	if (zipData.length > caps.zipBytes) {
		throw new Error(`Backup ZIP is too large (${zipData.length} bytes, limit ${caps.zipBytes})`);
	}
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(zipData);
	} catch {
		throw new Error('File is no valid backup ZIP');
	}
	// ZIP bomb guard: entry count and declared sizes are checked before the
	// first entry is decompressed.
	const names = Object.keys(zip.files);
	if (names.length > caps.entries) {
		throw new Error(`Backup ZIP has too many entries (${names.length}, limit ${caps.entries})`);
	}
	let declared = 0;
	for (const name of names) {
		const size = declaredSize(zip.files[name]);
		if (size === undefined) {
			continue;
		}
		declared += size;
		if (declared > caps.unpackedBytes) {
			throw new Error(`Backup ZIP would expand to at least ${declared} bytes (limit ${caps.unpackedBytes})`);
		}
	}
	const manifestFile = zip.file('manifest.json');
	const dumpFile = zip.file('dump.json');
	if (!manifestFile || !dumpFile) {
		throw new Error('Backup ZIP misses manifest.json or dump.json');
	}
	const manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest;
	if (manifest.app !== BACKUP_APP_ID || manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
		throw new Error(`Unsupported backup (app=${String(manifest.app)}, format=${String(manifest.formatVersion)})`);
	}
	if (manifest.schemaVersion > LATEST_SCHEMA_VERSION) {
		throw new Error(`Backup needs schema v${manifest.schemaVersion}, adapter knows v${LATEST_SCHEMA_VERSION}`);
	}
	// Read the artifact files once: the restore writes exactly these buffers,
	// so a second read can no longer fail after the database was replaced.
	const files: { path: string; data: Buffer }[] = [];
	let unpacked = 0;
	for (const file of manifest.files ?? []) {
		assertSafeEntryPath(file.path);
		const entry = zip.file(`files/${file.path}`);
		if (!entry) {
			throw new Error(`Backup misses file: files/${file.path}`);
		}
		const data = Buffer.from(await entry.async('nodebuffer'));
		unpacked += data.length;
		if (unpacked > caps.unpackedBytes) {
			throw new Error(`Backup expands to more than ${caps.unpackedBytes} bytes`);
		}
		if (sha256Hex(data) !== file.sha256 || data.length !== file.size) {
			throw new Error(`Checksum mismatch: files/${file.path}`);
		}
		files.push({ path: file.path, data });
	}

	const declaredDump = declaredSize(dumpFile);
	if (declaredDump !== undefined && declaredDump > caps.dumpBytes) {
		throw new Error(`Backup dump.json is too large (${declaredDump} bytes, limit ${caps.dumpBytes})`);
	}
	const dumpJsonText = await dumpFile.async('string');
	if (Buffer.byteLength(dumpJsonText, 'utf8') > caps.dumpBytes) {
		throw new Error(`Backup dump.json is too large (limit ${caps.dumpBytes})`);
	}
	if (manifest.dumpSha256 && sha256Hex(dumpJsonText) !== manifest.dumpSha256) {
		throw new Error('Checksum mismatch: dump.json');
	}
	let dumpJson: Omit<DatabaseDump, 'attachments'> & { attachments: DumpJsonAttachment[] };
	try {
		dumpJson = JSON.parse(dumpJsonText) as typeof dumpJson;
	} catch {
		throw new Error('Backup ZIP is corrupt: dump.json is not readable JSON');
	}
	const dump: DatabaseDump = {
		formatVersion: 1,
		exportedAt: String(dumpJson.exportedAt ?? new Date().toISOString()),
		schemaVersion: Number(dumpJson.schemaVersion ?? 0),
		invoices: dumpJson.invoices ?? [],
		counters: dumpJson.counters ?? [],
		templates: dumpJson.templates ?? [],
		companies: dumpJson.companies ?? [],
		customers: dumpJson.customers ?? [],
		products: dumpJson.products ?? [],
		attachments: (dumpJson.attachments ?? []).map(attachment => ({
			id: attachment.id,
			invoiceId: attachment.invoiceId,
			filename: attachment.filename,
			mime: attachment.mime,
			size: attachment.size,
			data: Buffer.from(attachment.dataBase64 ?? '', 'base64'),
			createdAt: attachment.createdAt,
		})),
	};
	return { manifest, dump, files };
}

/**
 * Restores a backup ZIP: verifies the manifest, replaces the database
 * transactionally and rewrites the files.
 *
 * @param db - Open invoice database.
 * @param storage - File backend for writing artifacts.
 * @param zipData - Backup ZIP bytes.
 * @param log - Logger.
 * @param limits - Optional ZIP limits (defaults to the production caps).
 * @param options - Adapter version for the safety backup and the source for the restore log.
 * @param options.adapterVersion - Adapter version written into the safety backup.
 * @param options.source - Where the restore came from (`api`, `state`, ...).
 */
export async function restoreBackup(
	db: InvoiceDatabase,
	storage: BackupStorage,
	zipData: Buffer,
	log: BackupLogger,
	limits?: Partial<BackupLimits>,
	options: { adapterVersion?: string; source?: string } = {},
): Promise<RestoreSummary> {
	const { manifest, dump, files } = await readAndVerifyBackup(zipData, limits);

	// H3: a restore replaces everything, so the current state is saved first.
	// Without that copy the restore is not started.
	let safetyBackup: string | null = null;
	try {
		const safety = await createBackup(db, storage, log, options.adapterVersion ?? 'unknown');
		safetyBackup = safety.filename.replace('-backup-', '-prerestore-');
		await storage.write(safetyBackup, safety.data);
		db.logBackup({
			filename: safetyBackup,
			size: safety.size,
			sha256: safety.sha256,
			manifestJson: JSON.stringify(safety.manifest),
		});
		log.info(`Safety backup before restore: ${safetyBackup}`);
	} catch (error) {
		throw new Error(`Restore aborted: the safety backup of the current state failed (${(error as Error).message})`);
	}

	// H3: counters never move backwards, so no issued number is reused.
	const { counters, raised } = mergeCounters(dump.counters, db.exportData().counters);
	dump.counters = counters;
	if (raised.length > 0) {
		log.info(`Restore keeps ${raised.length} counter(s) ahead of the backup: ${raised.join('; ')}`);
	}

	db.importData(dump);
	if (!db.getDefaultTemplate()) {
		db.ensureDefaultTemplate();
	}
	log.info(`Database restored: ${dump.invoices.length} invoices, ${dump.templates.length} templates`);

	const filesWritten: string[] = [];
	const fileErrors: string[] = [];
	for (const file of files) {
		try {
			await storage.write(file.path, file.data);
			filesWritten.push(file.path);
		} catch (error) {
			const message = `${file.path}: ${(error as Error).message}`;
			fileErrors.push(message);
			log.error(`Restore cannot write ${message}`);
		}
	}

	// audit trail: who restored what and when stays readable outside the database
	try {
		let previous = '';
		try {
			previous = (await storage.read('backups/restore-log.jsonl')).toString('utf8');
		} catch {
			// first entry
		}
		const entry = JSON.stringify({
			at: new Date().toISOString(),
			source: options.source ?? 'api',
			backupCreatedAt: manifest.createdAt,
			invoices: dump.invoices.length,
			safetyBackup,
			countersKept: raised,
		});
		await storage.write('backups/restore-log.jsonl', `${previous}${entry}\n`);
	} catch (error) {
		log.error(`Cannot write the restore log: ${(error as Error).message}`);
	}
	return {
		manifest,
		invoices: dump.invoices.length,
		templates: dump.templates.length,
		filesWritten,
		fileErrors,
		safetyBackup,
		countersKept: raised,
	};
}
