/**
 * Copy of the backups to an external server over SFTP.
 *
 * The adapter makes its backups on the ioBroker host, next to the database they protect. A copy on another
 * machine (a NAS, a root server) survives the loss of that host. The copy is made with the SFTP protocol
 * itself — no mount, no `sudo`, no shell command: the adapter opens an SSH connection, writes the ZIP and
 * closes it again.
 *
 * What is guaranteed:
 * - the local backup is never touched, a failed copy is reported and nothing else happens;
 * - a copy appears under its final name only when it is complete (upload as `.part`, then rename) and has
 *   the size of the original;
 * - old copies are only deleted when asked for, and only the automatic backups of this adapter.
 *
 * This file holds the logic and works against the small `SftpSession` interface, so it is tested without a
 * server. The real connection is in `sftp-ssh2.ts`.
 */
import { AUTO_BACKUP_PREFIX } from './backup';

/** Instance settings of the external copy. */
export interface RemoteBackupSettings {
	/** Copy switched on. */
	enabled?: boolean;
	/** Host name or IP address of the SFTP server. */
	host?: string;
	/** SSH port, 22 when empty. */
	port?: number;
	/** User name. */
	username?: string;
	/** Password. */
	password?: string;
	/** Target directory on the server, e.g. `/backups/e-invoices`. */
	directory?: string;
	/** Fingerprint of the host key (`SHA256:…` or hex); empty = not verified. */
	hostKey?: string;
	/** Automatic copies kept on the server, 0 = keep all. */
	keep?: number;
}

/** One open SFTP connection, reduced to what the copy needs. */
export interface SftpSession {
	/** Creates the directory and its parents when they are missing. */
	makeDirectories(directory: string): Promise<void>;
	/** Writes a file. */
	writeFile(path: string, data: Buffer): Promise<void>;
	/** Size of a file in bytes. */
	size(path: string): Promise<number>;
	/** Renames a file. */
	rename(from: string, to: string): Promise<void>;
	/** File names (no paths) in a directory. */
	list(directory: string): Promise<string[]>;
	/** Deletes a file. */
	remove(path: string): Promise<void>;
	/** Closes the connection. */
	close(): void;
}

/** Opens an SFTP connection; `onHostKey` hears the fingerprint of the server (`SHA256:…`). */
export type SftpConnector = (
	settings: Required<Pick<RemoteBackupSettings, 'host' | 'port' | 'username' | 'password'>> & {
		hostKey: string;
		onHostKey: (fingerprint: string) => void;
	},
) => Promise<SftpSession>;

/** The timers of the adapter (`this.setTimeout`), so a pending timeout is cancelled when the adapter stops. */
export interface Timers {
	/** Starts a timer. */
	start(callback: () => void, ms: number): unknown;
	/** Stops a timer. */
	stop(handle: unknown): void;
}

/** Logger of the copy. */
export interface RemoteLogger {
	/** Normal message. */
	info(message: string): void;
	/** Something the operator should look at. */
	warn(message: string): void;
}

/** Outcome of one copy. */
export interface RemoteCopyResult {
	/** True when the file is on the server in full. */
	ok: boolean;
	/** Short text for the log, the info state and the web app. */
	message: string;
	/** Name of the file on the server (ok only). */
	remoteFile?: string;
	/** Old copies deleted on the server. */
	deleted: string[];
}

/** Default SSH port. */
const DEFAULT_PORT = 22;

/** The whole copy (connect, upload, check, tidy) must not take longer than this. */
export const REMOTE_COPY_TIMEOUT_MS = 10 * 60_000;

/** Name of the automatic backups without the directory, e.g. `e-invoices-auto-`. */
const AUTO_BASE_PREFIX = AUTO_BACKUP_PREFIX.slice(AUTO_BACKUP_PREFIX.lastIndexOf('/') + 1);

/**
 * Normalizes the target directory: forward slashes, no trailing slash, no `.` or empty segments.
 *
 * @param directory - Directory as typed by the user.
 * @returns The directory, `/` or a path; null when it holds a `..` segment.
 */
export function normalizeRemoteDirectory(directory: string | undefined): string | null {
	const text = (directory ?? '').trim().replace(/\\/g, '/');
	const absolute = text.startsWith('/');
	const parts: string[] = [];
	for (const part of text.split('/')) {
		if (part === '' || part === '.') {
			continue;
		}
		if (part === '..') {
			return null;
		}
		parts.push(part);
	}
	const joined = parts.join('/');
	return absolute ? `/${joined}` : joined;
}

/**
 * Names what is wrong with the settings, so the operator sees it before a copy fails.
 *
 * @param settings - Instance settings of the copy.
 * @returns One text per problem, empty when the copy can be tried.
 */
export function remoteSettingsProblems(settings: RemoteBackupSettings): string[] {
	const problems: string[] = [];
	if (!settings.host?.trim()) {
		problems.push('the host is missing');
	}
	if (!settings.username?.trim()) {
		problems.push('the user name is missing');
	}
	if (!settings.password) {
		problems.push('the password is missing');
	}
	const port = settings.port === undefined || settings.port === 0 ? DEFAULT_PORT : Number(settings.port);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		problems.push('the port must be between 1 and 65535');
	}
	if (normalizeRemoteDirectory(settings.directory) === null) {
		problems.push('the directory must not contain ".."');
	}
	return problems;
}

/**
 * Checks the fingerprint of a server against the one the operator entered.
 *
 * @param expected - `SHA256:…` (base64, as `ssh-keygen -l` and the Synology show it) or the hex digest, with or
 *   without colons. Empty = nothing to compare.
 * @param hexHash - SHA-256 of the host key as a hex digest, as ssh2 delivers it.
 * @returns True when they are the same key.
 */
export function hostKeyMatches(expected: string, hexHash: string): boolean {
	const wanted = expected.trim();
	if (!wanted) {
		return true;
	}
	const hex = hexHash.toLowerCase();
	const asHex = wanted.replace(/^sha256:/i, '').replace(/:/g, '');
	if (/^[0-9a-f]{64}$/i.test(asHex)) {
		return asHex.toLowerCase() === hex;
	}
	return wanted.replace(/^sha256:/i, '').replace(/=+$/, '') === hexToFingerprint(hex).replace(/^SHA256:/, '');
}

/**
 * Writes a hex digest the way OpenSSH and the Synology show it: `SHA256:` and base64 without padding.
 *
 * @param hexHash - SHA-256 digest as hex.
 */
export function hexToFingerprint(hexHash: string): string {
	return `SHA256:${Buffer.from(hexHash, 'hex').toString('base64').replace(/=+$/, '')}`;
}

// Fails a promise that takes too long (a server that accepts the connection and then says nothing).
async function withTimeout<T>(
	timers: Timers,
	work: Promise<T>,
	ms: number,
	what: string,
	onTimeout: () => void,
): Promise<T> {
	let timer: unknown;
	const limit = new Promise<never>((_resolve, reject) => {
		timer = timers.start(() => {
			onTimeout();
			reject(new Error(`${what} took longer than ${Math.round(ms / 1000)} s`));
		}, ms);
	});
	try {
		return await Promise.race([work, limit]);
	} finally {
		timers.stop(timer);
	}
}

/**
 * Picks the automatic copies that exceed the number to keep (the oldest ones).
 *
 * Only files with the name of an automatic backup qualify: copies of backups made by hand and every other file
 * in the directory are never touched. `keep` 0 (or less) keeps everything. The time stamp is in the name, so the
 * alphabetical order is the age.
 *
 * @param names - File names in the target directory.
 * @param keep - Automatic copies to keep.
 */
export function selectRemoteCopiesToPrune(names: string[], keep: number): string[] {
	if (!Number.isFinite(keep) || keep <= 0) {
		return [];
	}
	const automatic = names
		.filter(name => name.startsWith(AUTO_BASE_PREFIX) && name.endsWith('.zip'))
		.sort()
		.reverse();
	return automatic.slice(Math.floor(keep));
}

/**
 * Copies one backup to the server.
 *
 * @param connect - Opens the SFTP connection.
 * @param settings - Instance settings of the copy.
 * @param backup - The backup: its file name below the storage mount and the ZIP bytes.
 * @param backup.filename - Path of the backup below the mount, e.g. `backups/e-invoices-auto-….zip`.
 * @param backup.data - ZIP bytes.
 * @param log - Logger.
 * @param timers - The adapter's timers.
 * @param limitMs - Longest time for the whole copy.
 * @returns The result; it never throws, the caller decides what a failure means.
 */
export async function copyBackupToRemote(
	connect: SftpConnector,
	settings: RemoteBackupSettings,
	backup: { filename: string; data: Buffer },
	log: RemoteLogger,
	timers: Timers,
	limitMs = REMOTE_COPY_TIMEOUT_MS,
): Promise<RemoteCopyResult> {
	const problems = remoteSettingsProblems(settings);
	if (problems.length > 0) {
		return { ok: false, message: `settings incomplete: ${problems.join(', ')}`, deleted: [] };
	}
	const directory = normalizeRemoteDirectory(settings.directory) ?? '';
	const name = backup.filename.slice(backup.filename.lastIndexOf('/') + 1);
	const target = directory === '/' ? `/${name}` : directory ? `${directory}/${name}` : name;
	let session: SftpSession | undefined;
	let expired = false;
	const deleted: string[] = [];
	try {
		const work = (async (): Promise<void> => {
			const opened = await connect({
				host: settings.host!.trim(),
				port: settings.port ? Number(settings.port) : DEFAULT_PORT,
				username: settings.username!.trim(),
				password: settings.password!,
				hostKey: settings.hostKey?.trim() ?? '',
				onHostKey: fingerprint => {
					if (!settings.hostKey?.trim()) {
						log.warn(
							`The host key of the external server is not verified. To trust only this server, enter its fingerprint in the settings: ${fingerprint}`,
						);
					}
				},
			});
			session = opened;
			// the time ran out while connecting: close at once instead of uploading after the failure was reported
			if (expired) {
				opened.close();
				return;
			}
			if (directory) {
				await session.makeDirectories(directory);
			}
			const partial = `${target}.part`;
			await session.writeFile(partial, backup.data);
			const written = await session.size(partial);
			if (written !== backup.data.length) {
				throw new Error(`the upload is incomplete (${written} of ${backup.data.length} bytes)`);
			}
			await session.rename(partial, target);
			if (name.startsWith(AUTO_BASE_PREFIX)) {
				for (const old of selectRemoteCopiesToPrune(await session.list(directory || '.'), settings.keep ?? 0)) {
					try {
						await session.remove(directory === '/' ? `/${old}` : directory ? `${directory}/${old}` : old);
						deleted.push(old);
					} catch (error) {
						log.warn(
							`Cannot delete the old copy ${old} on the external server: ${(error as Error).message}`,
						);
					}
				}
			}
		})();
		await withTimeout(timers, work, limitMs, 'The copy to the external server', () => {
			expired = true;
			session?.close();
		});
		return { ok: true, message: `copied ${name}`, remoteFile: target, deleted };
	} catch (error) {
		return { ok: false, message: (error as Error).message, deleted };
	} finally {
		session?.close();
	}
}

/**
 * The settings for the connection test of the admin page, from the values of the form.
 *
 * The form may hold unsaved values. An empty password field means "the saved one" — but only for the saved
 * server and user: otherwise any script could send this message with its own host and receive the stored
 * password at the login (the password is protected from other adapters for a reason).
 *
 * @param form - Values of the form (`native` of the instance as the admin page sends it).
 * @param saved - The saved instance settings.
 */
export function settingsForConnectionTest(
	form: Record<string, unknown>,
	saved: RemoteBackupSettings,
): RemoteBackupSettings {
	const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
	const host = text(form.remoteHost) ?? saved.host ?? '';
	const username = text(form.remoteUser) ?? saved.username ?? '';
	const port = Number(form.remotePort ?? saved.port) || DEFAULT_PORT;
	const sameServer =
		host.trim() === (saved.host ?? '').trim() &&
		username.trim() === (saved.username ?? '').trim() &&
		port === (Number(saved.port) || DEFAULT_PORT);
	return {
		enabled: true,
		host,
		port,
		username,
		password: text(form.remotePassword) || (sameServer ? saved.password : undefined),
		directory: text(form.remoteDirectory) ?? saved.directory,
		hostKey: text(form.remoteHostKey) ?? saved.hostKey,
	};
}

/**
 * Tries the connection without writing anything of a backup: connects, makes sure the directory exists and
 * writes and deletes a small test file, so a wrong password or a directory without permission shows up now and
 * not at the first backup.
 *
 * @param connect - Opens the SFTP connection.
 * @param settings - Instance settings of the copy.
 * @param timers - The adapter's timers.
 * @param limitMs - Longest time for the test.
 * @returns The result; it never throws.
 */
export async function testRemoteConnection(
	connect: SftpConnector,
	settings: RemoteBackupSettings,
	timers: Timers,
	limitMs = 60_000,
): Promise<{ ok: boolean; message: string; fingerprint?: string }> {
	const problems = remoteSettingsProblems(settings);
	if (problems.length > 0) {
		return { ok: false, message: `settings incomplete: ${problems.join(', ')}` };
	}
	const directory = normalizeRemoteDirectory(settings.directory) ?? '';
	let session: SftpSession | undefined;
	let expired = false;
	let fingerprint: string | undefined;
	try {
		const work = (async (): Promise<void> => {
			const opened = await connect({
				host: settings.host!.trim(),
				port: settings.port ? Number(settings.port) : DEFAULT_PORT,
				username: settings.username!.trim(),
				password: settings.password!,
				hostKey: settings.hostKey?.trim() ?? '',
				onHostKey: found => {
					fingerprint = found;
				},
			});
			session = opened;
			if (expired) {
				opened.close();
				return;
			}
			if (directory) {
				await session.makeDirectories(directory);
			}
			const probe = `${directory === '/' ? '' : directory ? `${directory}/` : ''}.e-invoices-connection-test`;
			await session.writeFile(probe, Buffer.from('ok'));
			await session.remove(probe);
		})();
		await withTimeout(timers, work, limitMs, 'The connection test', () => {
			expired = true;
			session?.close();
		});
		return { ok: true, message: 'connected, the directory is writable', fingerprint };
	} catch (error) {
		return { ok: false, message: (error as Error).message, fingerprint };
	} finally {
		session?.close();
	}
}
