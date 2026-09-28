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
	zip.file('dump.json', JSON.stringify(dumpJson, null, 2));
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
	};
	zip.file('manifest.json', JSON.stringify(manifest, null, 2));
	const data = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
	const filename = `backups/e-invoices-backup-${stampName()}.zip`;
	return { filename, size: data.length, sha256: sha256Hex(data), manifest, data };
}

/**
 * Restores a backup ZIP: verifies the manifest, replaces the database
 * transactionally and rewrites the files.
 *
 * @param db - Open invoice database.
 * @param storage - File backend for writing artifacts.
 * @param zipData - Backup ZIP bytes.
 * @param log - Logger.
 */
export async function restoreBackup(
	db: InvoiceDatabase,
	storage: BackupStorage,
	zipData: Buffer,
	log: BackupLogger,
): Promise<RestoreSummary> {
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(zipData);
	} catch {
		throw new Error('File is no valid backup ZIP');
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
	for (const file of manifest.files ?? []) {
		const entry = zip.file(`files/${file.path}`);
		if (!entry) {
			throw new Error(`Backup misses file: files/${file.path}`);
		}
		const data = Buffer.from(await entry.async('nodebuffer'));
		if (sha256Hex(data) !== file.sha256 || data.length !== file.size) {
			throw new Error(`Checksum mismatch: files/${file.path}`);
		}
	}

	const dumpJson = JSON.parse(await dumpFile.async('string')) as Omit<DatabaseDump, 'attachments'> & {
		attachments: DumpJsonAttachment[];
	};
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
	db.importData(dump);
	if (!db.getDefaultTemplate()) {
		db.ensureDefaultTemplate();
	}
	log.info(`Database restored: ${dump.invoices.length} invoices, ${dump.templates.length} templates`);

	const filesWritten: string[] = [];
	const fileErrors: string[] = [];
	for (const file of manifest.files ?? []) {
		const entry = zip.file(`files/${file.path}`);
		if (!entry) {
			continue;
		}
		try {
			const data = Buffer.from(await entry.async('nodebuffer'));
			await storage.write(file.path, data);
			filesWritten.push(file.path);
		} catch (error) {
			const message = `${file.path}: ${(error as Error).message}`;
			fileErrors.push(message);
			log.error(`Restore cannot write ${message}`);
		}
	}
	return { manifest, invoices: dump.invoices.length, templates: dump.templates.length, filesWritten, fileErrors };
}
