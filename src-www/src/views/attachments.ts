/**
 * Anlagen-Bereich der PWA (R4).
 *
 * Ein gemeinsamer Baustein für die Detailseite und den Wizard: Dateien
 * hochladen (mit Fortschritt), Liste mit Typ/Größe, Download und Löschen.
 * Die Regeln selbst liegen auf dem Server (`src/lib/attachments.ts`) — hier
 * stehen sie nur als Vorprüfung, damit der Nutzer nicht erst nach dem Upload
 * erfährt, dass eine Datei zu groß ist. Der Server bleibt die Instanz.
 */
import { api, downloadUrl, esc, type AttachmentMeta } from '../api';
import { locale, t } from '../i18n';

/** Maximale Dateigröße (gespiegelt von `ATTACHMENT_MAX_BYTES`). */
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

/** Maximale Anzahl je Rechnung (gespiegelt von `ATTACHMENT_MAX_COUNT`). */
export const ATTACHMENT_MAX_COUNT = 10;

/** Erlaubte Dateiendungen (der Inhalt entscheidet, nicht die Endung). */
export const ATTACHMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];

/**
 * Dateigröße lesbar machen (kB unterhalb eines MB).
 *
 * @param bytes - Größe in Bytes.
 */
export function formatSize(bytes: number): string {
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
	}
	return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/**
 * Typ-Label für die Liste.
 *
 * @param mime - Vom Server gelieferter MIME-Typ.
 */
export function typeLabel(mime: string): string {
	if (mime === 'application/pdf') {
		return 'PDF';
	}
	if (mime === 'image/png') {
		return 'PNG';
	}
	if (mime === 'image/jpeg') {
		return 'JPEG';
	}
	return mime;
}

/**
 * Endung klein und ohne Punkt.
 *
 * @param filename - Dateiname.
 */
function extensionOf(filename: string): string {
	const dot = filename.lastIndexOf('.');
	return dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

/**
 * Liest eine Datei als Base64 (chunkweise, damit große Dateien nicht knallen).
 *
 * @param data - Inhalt der Datei.
 */
function toBase64(data: ArrayBuffer): string {
	const bytes = new Uint8Array(data);
	let binary = '';
	const chunk = 0x8000;
	for (let index = 0; index < bytes.length; index += chunk) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
	}
	return btoa(binary);
}

/**
 * Zeichnet den Anlagen-Bereich in `host` und verdrahtet ihn.
 *
 * @param host - Leerer Container, der den Bereich aufnimmt.
 * @param invoiceId - Rechnungs-UUID (Entwurf oder ausgestellt).
 * @param options - `readOnly` für ausgestellte Rechnungen (GoBD: eingefroren).
 * @param options.readOnly - True when the field is read-only.
 */
export function mountAttachments(host: HTMLElement, invoiceId: string, options: { readOnly: boolean }): void {
	let files: AttachmentMeta[] = [];
	host.innerHTML = `
		<div class="card att">
			<div class="row"><h3 style="margin:0">${t('Anlagen')}</h3><span class="muted" id="att-count"></span></div>
			<p class="muted">${t('Belege zum Vorgang (Lieferschein, Nachweis, Bestellbestätigung) — PDF, PNG oder JPEG, höchstens {max} Dateien mit je {size}. Beim Ausstellen werden sie in die Rechnung eingebettet (PDF/A-3, im XML als BG-24).', { max: ATTACHMENT_MAX_COUNT, size: formatSize(ATTACHMENT_MAX_BYTES) })}</p>
			${
				options.readOnly
					? `<p class="muted">${t('Diese Rechnung ist ausgestellt: die Anlagen bleiben abrufbar, lassen sich aber nicht mehr ändern (GoBD).')}</p>`
					: `<div class="row att-upload">
						<input type="file" id="att-file" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" />
						<button id="att-add">${t('Hochladen')}</button>
					</div>
					<progress id="att-progress" max="100" value="0" hidden></progress>`
			}
			<div id="att-list" class="muted">${t('Lade …')}</div>
			<p id="att-out" class="muted"></p>
		</div>`;

	const list = host.querySelector<HTMLElement>('#att-list')!;
	const out = host.querySelector<HTMLElement>('#att-out')!;
	const count = host.querySelector<HTMLElement>('#att-count')!;

	/** Zeichnet die Liste neu. */
	function draw(): void {
		count.textContent = files.length > 0 ? t('{n} von {max}', { n: files.length, max: ATTACHMENT_MAX_COUNT }) : '';
		if (files.length === 0) {
			list.className = 'muted';
			list.textContent = options.readOnly ? t('Keine Anlagen an dieser Rechnung.') : t('Noch keine Anlagen.');
			return;
		}
		list.className = '';
		list.innerHTML = `<table class="ovw att-table"><thead><tr>
				<th>${t('Datei')}</th><th>${t('Typ')}</th><th class="r">${t('Größe')}</th><th class="r">${t('Aktion')}</th>
			</tr></thead><tbody>${files
				.map(
					file => `<tr>
						<td>${esc(file.filename)}</td>
						<td>${esc(typeLabel(file.mime))}</td>
						<td class="r">${esc(formatSize(file.size))}</td>
						<td class="r">
							<button class="secondary" data-download="${file.id}">${t('Download')}</button>
							${options.readOnly ? '' : `<button class="danger" data-delete="${file.id}">${t('Löschen')}</button>`}
						</td>
					</tr>`,
				)
				.join('')}</tbody></table>`;

		list.querySelectorAll<HTMLElement>('[data-download]').forEach(button =>
			button.addEventListener('click', () => {
				const id = Number(button.dataset.download);
				const file = files.find(entry => entry.id === id);
				void downloadUrl(api.attachments.url(invoiceId, id), file?.filename ?? 'anlage.pdf').catch(error => {
					out.className = 'error';
					out.textContent = (error as Error).message;
				});
			}),
		);
		list.querySelectorAll<HTMLElement>('[data-delete]').forEach(button =>
			button.addEventListener('click', () => {
				const id = Number(button.dataset.delete);
				const file = files.find(entry => entry.id === id);
				if (!window.confirm(t('Anlage „{name}" wirklich löschen?', { name: file?.filename ?? id }))) {
					return;
				}
				void (async () => {
					try {
						await api.attachments.remove(invoiceId, id);
						files = await api.attachments.list(invoiceId);
						draw();
						out.className = 'muted';
						out.textContent = t('Anlage gelöscht.');
					} catch (error) {
						out.className = 'error';
						out.textContent = (error as Error).message;
					}
				})();
			}),
		);
	}

	/**
	 * Prüft eine Datei gegen die Server-Regeln (Vorprüfung).
	 *
	 * @param file - Datei aus dem Dateiauswahlfeld.
	 */
	function check(file: File): string | null {
		if (file.size === 0) {
			return t('{name}: leere Datei', { name: file.name });
		}
		if (file.size > ATTACHMENT_MAX_BYTES) {
			return t('{name}: größer als {size}', { name: file.name, size: formatSize(ATTACHMENT_MAX_BYTES) });
		}
		if (!ATTACHMENT_EXTENSIONS.includes(extensionOf(file.name))) {
			return t('{name}: nur PDF, PNG und JPEG', { name: file.name });
		}
		return null;
	}

	host.querySelector('#att-add')?.addEventListener('click', () => {
		const input = host.querySelector<HTMLInputElement>('#att-file');
		const progress = host.querySelector<HTMLProgressElement>('#att-progress');
		const chosen = [...(input?.files ?? [])];
		void (async () => {
			out.className = 'muted';
			out.textContent = '';
			if (chosen.length === 0) {
				out.className = 'error';
				out.textContent = t('Bitte zuerst eine Datei auswählen.');
				return;
			}
			if (files.length + chosen.length > ATTACHMENT_MAX_COUNT) {
				out.className = 'error';
				out.textContent = t('Höchstens {max} Anlagen je Rechnung (bisher {n}).', {
					max: ATTACHMENT_MAX_COUNT,
					n: files.length,
				});
				return;
			}
			const rejected = chosen.map(check).filter((message): message is string => message !== null);
			if (rejected.length > 0) {
				out.className = 'error';
				out.textContent = rejected.join(' · ');
				return;
			}
			if (progress) {
				progress.hidden = false;
				progress.value = 0;
			}
			try {
				for (const [index, file] of chosen.entries()) {
					const dataBase64 = toBase64(await file.arrayBuffer());
					await api.attachments.add(invoiceId, { filename: file.name, mime: file.type, dataBase64 });
					if (progress) {
						progress.value = Math.round(((index + 1) / chosen.length) * 100);
					}
				}
				files = await api.attachments.list(invoiceId);
				draw();
				if (input) {
					input.value = '';
				}
				out.className = 'muted';
				out.textContent = t('{n} Anlage(n) gespeichert.', { n: chosen.length });
			} catch (error) {
				out.className = 'error';
				out.textContent = (error as Error).message;
			} finally {
				if (progress) {
					progress.hidden = true;
				}
			}
		})();
	});

	// Erster Aufbau: der Server kennt die Dateien, die Liste kommt von dort.
	void api.attachments
		.list(invoiceId)
		.then(loaded => {
			files = loaded;
			draw();
		})
		.catch(error => {
			list.className = 'error';
			list.textContent = (error as Error).message;
		});
}
