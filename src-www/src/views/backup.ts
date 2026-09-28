import { apiFetch, downloadUrl, esc } from '../api';

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

/** Backup page: create, list, download, restore. */
export async function backup(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">Lade Backups…</div>`;
	let items: BackupEntry[] = [];
	let message = '';
	let isError = false;

	async function reload(): Promise<void> {
		const res = await apiFetch('/api/backups');
		if (!res.ok) throw new Error('Backups konnten nicht geladen werden');
		items = (await res.json()) as BackupEntry[];
		render();
	}

	function render(): void {
		root.innerHTML = `
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${message ? `<p class="${isError ? 'error' : ''}">${esc(message)}</p>` : ''}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${items
				.map(
					b => `<div class="row" style="margin-top:8px">
				<strong>${esc(baseName(b.filename))}</strong>
				<span class="muted">${esc(b.createdAt.slice(0, 19).replace('T', ' '))} · ${Math.round(b.size / 1024)} KB</span>
				<button class="secondary" data-dl="${esc(b.filename)}">Download</button>
				<button class="secondary" data-restore="${esc(b.filename)}">Wiederherstellen</button>
			</div>`,
				)
				.join('') || '<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`;

		root.querySelector('#b-now')?.addEventListener('click', async () => {
			try {
				const res = await apiFetch('/api/backups', { method: 'POST' });
				if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Sichern fehlgeschlagen');
				const created = (await res.json()) as BackupEntry;
				message = `Gesichert: ${baseName(created.filename)}`;
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
				if (!window.confirm(`Wirklich wiederherstellen aus ${baseName(filename)}? Die aktuelle Datenbank wird ersetzt.`)) return;
				try {
					const res = await apiFetch('/api/restore', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ filename }),
					});
					if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Restore fehlgeschlagen');
					const s = (await res.json()) as { invoices: number; templates: number; fileErrors: string[] };
					message = `Wiederhergestellt: ${s.invoices} Rechnungen, ${s.templates} Vorlagen${s.fileErrors.length > 0 ? ` (${s.fileErrors.length} Dateifehler)` : ''}`;
					isError = false;
					render();
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
				message = 'Bitte zuerst eine ZIP-Datei wählen';
				isError = true;
				render();
				return;
			}
			if (!window.confirm(`Wirklich wiederherstellen aus ${file.name}? Die aktuelle Datenbank wird ersetzt.`)) return;
			try {
				const dataBase64 = await new Promise<string>((resolve, reject) => {
					const r = new FileReader();
					r.onload = () => resolve(String(r.result).split(',')[1]);
					r.onerror = () => reject(new Error('Datei nicht lesbar'));
					r.readAsDataURL(file);
				});
				const res = await apiFetch('/api/restore', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ dataBase64 }),
				});
				if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Restore fehlgeschlagen');
				const s = (await res.json()) as { invoices: number; templates: number };
				message = `Wiederhergestellt: ${s.invoices} Rechnungen, ${s.templates} Vorlagen`;
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
