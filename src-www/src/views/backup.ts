import { api, apiFetch, downloadUrl, esc, fileToBase64, type RestorePreview } from '../api';
import { t } from '../i18n';

interface BackupEntry {
	id: string;
	createdAt: string;
	filename: string;
	size: number;
	sha256: string;
}

function baseName(path: string): string {
	return path.split('/').pop() ?? path;
}

/**
 * A restore replaces the whole database, so the user always sees the effect
 * first. The preview is mandatory: there is no way to skip it.
 *
 * @param source - Stored filename or an uploaded file.
 * @param source.filename - File name.
 * @param source.dataBase64 - File content, base64 encoded.
 * @returns Whether the user confirmed the restore.
 */
async function confirmRestore(source: { filename?: string; dataBase64?: string }): Promise<boolean> {
	let preview: RestorePreview;
	try {
		preview = await api.restorePreview(source.filename, source.dataBase64);
	} catch (e) {
		alert(t('Backup kann nicht gelesen werden: {message}', { message: (e as Error).message }));
		return false;
	}
	const overwritten = preview.overwritten.length;
	return window.confirm(
		[
			t('Vorschau für {name}:', {
				name: source.filename ? baseName(source.filename) : t('der hochgeladenen Datei'),
			}),
			``,
			`  ${t('Im Backup:')}   ${t('{n} Rechnungen (davon {issued} ausgestellt)', { n: preview.invoices, issued: preview.issued })}`,
			`  ${t('Aktuell:')}     ${t('{n} Rechnungen', { n: preview.currentInvoices })}`,
			`  ${t('Dateien:')}     ${preview.filesWritten}`,
			`  ${t('Neu dazu:')}    ${t('{n} Nummern', { n: preview.added.length })}`,
			`  ${t('Überschrieben:')} ${t('{n} Nummern', { n: overwritten })} ${overwritten ? `(${preview.overwritten.slice(0, 5).join(', ')}${preview.overwritten.length > 5 ? ' …' : ''})` : ''}`,
			``,
			preview.onlyHere.length > 0
				? t(
						'ACHTUNG: {n} Rechnungen, die nur hier existieren, verschwinden aus der Datenbank ({list}). Ihre Nummern werden nicht erneut vergeben.',
						{
							n: preview.onlyHere.length,
							list: `${preview.onlyHere.slice(0, 5).join(', ')}${preview.onlyHere.length > 5 ? ' …' : ''}`,
						},
					)
				: t('Die aktuelle Datenbank wird durch das Backup ersetzt.'),
			t('Vor dem Wiederherstellen wird der aktuelle Stand automatisch als "prerestore"-Backup gesichert.'),
			``,
			t('Trotzdem wiederherstellen?'),
		].join('\n'),
	);
}

/**
 * Backup page: create, list, download, restore.
 *
 * @param root - Element the page is rendered into.
 */
export async function backup(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Backups…')}</div>`;
	let items: BackupEntry[] = [];
	let message = '';
	let isError = false;

	async function reload(): Promise<void> {
		const res = await apiFetch('/api/backups');
		if (!res.ok) {
			throw new Error(t('Backups konnten nicht geladen werden'));
		}
		items = (await res.json()) as BackupEntry[];
		render();
	}

	function render(): void {
		root.innerHTML = `
		<div class="card"><div class="row"><strong>${t('Backup & Wiederherstellung')}</strong>
			<button id="b-now">${t('Jetzt sichern')}</button></div>
			<p class="muted">${t('ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.')}</p>
			${message ? `<p class="${isError ? 'error' : ''}">${esc(message)}</p>` : ''}
		</div>
		<div class="card"><h3>${t('Gesicherte Backups')}</h3>
			${
				items
					.map(
						b => `<div class="row" style="margin-top:8px">
				<strong>${esc(baseName(b.filename))}</strong>
				<span class="muted">${esc(b.createdAt.slice(0, 19).replace('T', ' '))} · ${Math.round(b.size / 1024)} KB</span>
				<button class="secondary" data-dl="${esc(b.filename)}">${t('Download')}</button>
				<button class="secondary" data-restore="${esc(b.filename)}">${t('Wiederherstellen')}</button>
			</div>`,
					)
					.join('') || `<p class="muted">${t('Noch keine Backups.')}</p>`
			}
		</div>
		<div class="card"><h3>${t('Backup-Datei hochladen & wiederherstellen')}</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">${t('Hochladen & wiederherstellen')}</button></p>
			<p class="muted">${t('Achtung: Wiederherstellen ersetzt die gesamte Datenbank.')}</p>
		</div>`;

		root.querySelector('#b-now')?.addEventListener('click', async () => {
			try {
				const res = await apiFetch('/api/backups', { method: 'POST' });
				if (!res.ok) {
					throw new Error(
						((await res.json().catch(() => ({}))) as { error?: string }).error ??
							t('Sichern fehlgeschlagen'),
					);
				}
				const created = (await res.json()) as BackupEntry;
				message = t('Gesichert: {name}', { name: baseName(created.filename) });
				isError = false;
				await reload();
			} catch (e) {
				message = (e as Error).message;
				isError = true;
				render();
			}
		});
		root.querySelectorAll('[data-dl]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const filename = (btn as HTMLElement).dataset.dl ?? '';
				try {
					await downloadUrl(`/api/backups/file/${baseName(filename)}`, baseName(filename));
				} catch (e) {
					message = (e as Error).message;
					isError = true;
					render();
				}
			}),
		);
		root.querySelectorAll('[data-restore]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const filename = (btn as HTMLElement).dataset.restore ?? '';
				if (!(await confirmRestore({ filename }))) {
					return;
				}
				try {
					const res = await apiFetch('/api/restore', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ filename }),
					});
					if (!res.ok) {
						throw new Error(
							((await res.json().catch(() => ({}))) as { error?: string }).error ??
								t('Restore fehlgeschlagen'),
						);
					}
					const s = (await res.json()) as { invoices: number; templates: number; fileErrors: string[] };
					message = `${t('Wiederhergestellt: {n} Rechnungen, {templates} Vorlagen', { n: s.invoices, templates: s.templates })}${s.fileErrors.length > 0 ? ` (${t('{n} Dateifehler', { n: s.fileErrors.length })})` : ''}`;
					isError = false;
					await reload();
				} catch (e) {
					message = (e as Error).message;
					isError = true;
					render();
				}
			}),
		);
		root.querySelector('#b-upload')?.addEventListener('click', async () => {
			const file = root.querySelector<HTMLInputElement>('#b-file')?.files?.[0];
			if (!file) {
				message = t('Bitte zuerst eine ZIP-Datei wählen');
				isError = true;
				render();
				return;
			}
			let dataBase64: string;
			try {
				dataBase64 = await fileToBase64(file);
			} catch (e) {
				message = (e as Error).message;
				isError = true;
				render();
				return;
			}
			// The preview runs on the uploaded bytes, so a broken file is
			// rejected before the current database is touched.
			if (!(await confirmRestore({ dataBase64 }))) {
				return;
			}
			try {
				const res = await apiFetch('/api/restore', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ dataBase64 }),
				});
				if (!res.ok) {
					throw new Error(
						((await res.json().catch(() => ({}))) as { error?: string }).error ??
							t('Restore fehlgeschlagen'),
					);
				}
				const s = (await res.json()) as { invoices: number; templates: number };
				message = t('Wiederhergestellt: {n} Rechnungen, {templates} Vorlagen', {
					n: s.invoices,
					templates: s.templates,
				});
				isError = false;
				await reload();
			} catch (e) {
				message = (e as Error).message;
				isError = true;
				render();
			}
		});
	}

	try {
		await reload();
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}
}
