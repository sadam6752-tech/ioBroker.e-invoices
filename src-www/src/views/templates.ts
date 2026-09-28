import { apiFetch, esc } from '../api';

interface Template {
	id: string;
	name: string;
	version: number;
	definition: Record<string, unknown> & {
		name: string;
		colors: { primary: string; text: string; muted: string };
		showEmail: boolean;
		showCustomerNumber: boolean;
		showPaymentTerms: boolean;
		footerText: string;
		showArchiveHint: boolean;
		showPageNumbers: boolean;
		showTagline: boolean;
		introText: string;
		closingText: string;
		signatureName: string;
		headerExtra: string;
		blocks: Record<string, boolean>;
		logo?: { path: string; position: string; widthMm: number };
	};
	isDefault: boolean;
}

const LOCKED = ['title', 'meta', 'parties', 'positions', 'totals'];
const FREE = ['payment', 'notes'];

/** Layout studio: list, edit, logo upload, PDF preview. */
export async function templates(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">Lade Vorlagen…</div>`;
	let items: Template[] = [];
	let editing: Template | null = null;
	let error = '';

	async function reload(): Promise<void> {
		items = await apiList();
		render();
	}

	async function apiList(): Promise<Template[]> {
		const res = await apiFetch('/api/templates');
		if (!res.ok) throw new Error('Vorlagen konnten nicht geladen werden');
		return (await res.json()) as Template[];
	}

	function formHtml(t: Template): string {
		const d = t.definition;
		const check = (key: string, label: string, locked: boolean): string =>
			`<label><input type="checkbox" data-f="blocks.${key}" ${d.blocks[key] ? 'checked' : ''} ${
				locked ? 'disabled' : ''
			} style="width:auto" /> ${label}${locked ? ' (Pflicht)' : ''}</label>`;
		return `
		<label>Name<input id="t-name" value="${esc(t.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${esc(d.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${esc(d.colors.text)}" /></label>
		</div>
		${LOCKED.map(k => check(k, `Block ${k}`, true)).join('')}
		${FREE.map(k => check(k, `Block ${k}`, false)).join('')}
		<label><input type="checkbox" data-f="showEmail" ${d.showEmail ? 'checked' : ''} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${d.showCustomerNumber ? 'checked' : ''} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${d.showPaymentTerms ? 'checked' : ''} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${d.showArchiveHint ? 'checked' : ''} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showTagline" ${d.showTagline !== false ? 'checked' : ''} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${esc(d.introText ?? '')}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${esc(d.closingText ?? '')}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${esc(d.signatureName ?? '')}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${esc(d.headerExtra ?? '')}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${esc(d.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${['right', 'left', 'center'].map(p => `<option ${d.logo?.position === p ? 'selected' : ''}>${p}</option>`).join('')}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${d.logo?.widthMm ?? 30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${d.logo ? `<p class="muted">Aktuell: ${esc(d.logo.path)}</p>` : ''}`;
	}

	function render(): void {
		root.innerHTML = `
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${items
				.map(
					t => `<div class="row" style="margin-top:8px">
				<strong>${esc(t.name)}</strong><span class="muted">v${t.version}</span>
				${t.isDefault ? `<span class="badge issued">Standard</span>` : ''}
				<button class="secondary" data-edit="${t.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${t.id}">Vorschau</button>
				${t.isDefault ? '' : `<button class="secondary" data-def="${t.id}">Standard</button>`}
				${t.isDefault ? '' : `<button class="danger" data-del="${t.id}">Löschen</button>`}
			</div>`,
				)
				.join('') || '<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${editing ? `<div class="card"><h3>${esc(editing.id === 'neu' ? 'Neue Vorlage' : editing.name)}</h3>${formHtml(editing)}
			${error ? `<p class="error">${esc(error)}</p>` : ''}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>` : ''}`;

		root.querySelector('#t-new')?.addEventListener('click', async () => {
			const res = await apiFetch('/api/templates');
			const list = (await res.json()) as Template[];
			const first = list[0];
			if (!first) {
				error = 'Keine Basisvorlage vorhanden';
				render();
				return;
			}
			editing = { ...structuredClone(first), id: 'neu', name: 'Neu', version: 1, isDefault: false };
			error = '';
			render();
		});
		root.querySelectorAll('[data-edit]').forEach(b =>
			b.addEventListener('click', () => {
				const t = items.find(x => x.id === (b as HTMLElement).dataset.edit);
				if (t) {
					editing = structuredClone(t);
					error = '';
					render();
				}
			}),
		);
		root.querySelectorAll('[data-prev]').forEach(b =>
			b.addEventListener('click', async () => {
				const t = items.find(x => x.id === (b as HTMLElement).dataset.prev);
				if (!t) return;
				const res = await apiFetch('/api/templates/preview', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ definition: t.definition }),
				});
				if (!res.ok) {
					error = 'Vorschau fehlgeschlagen';
					render();
					return;
				}
				const blob = await res.blob();
				window.open(URL.createObjectURL(blob), '_blank');
			}),
		);
		root.querySelectorAll('[data-def]').forEach(b =>
			b.addEventListener('click', async () => {
				await apiFetch(`/api/templates/${(b as HTMLElement).dataset.def}/default`, { method: 'POST' });
				editing = null;
				await reload();
			}),
		);
		root.querySelectorAll('[data-del]').forEach(b =>
			b.addEventListener('click', async () => {
				const res = await apiFetch(`/api/templates/${(b as HTMLElement).dataset.del}`, { method: 'DELETE' });
				if (!res.ok) {
					const j = (await res.json().catch(() => ({}))) as { error?: string };
					error = j.error ?? 'Löschen fehlgeschlagen';
					render();
					return;
				}
				await reload();
			}),
		);
		root.querySelector('#t-cancel')?.addEventListener('click', () => {
			editing = null;
			error = '';
			render();
		});
		root.querySelector('#t-save')?.addEventListener('click', () => void save());
	}

	async function save(): Promise<void> {
		if (!editing) return;
		const def = structuredClone(editing.definition);
		def.name = (root.querySelector<HTMLInputElement>('#t-name')?.value ?? def.name).trim();
		def.colors.primary = root.querySelector<HTMLInputElement>('#t-c1')?.value ?? def.colors.primary;
		def.colors.text = root.querySelector<HTMLInputElement>('#t-c2')?.value ?? def.colors.text;
		for (const k of FREE) {
			def.blocks[k] = root.querySelector<HTMLInputElement>(`[data-f="blocks.${k}"]`)?.checked ?? def.blocks[k];
		}
		for (const k of ['showEmail', 'showCustomerNumber', 'showPaymentTerms', 'showArchiveHint', 'showPageNumbers', 'showTagline'] as const) {
			(def as unknown as Record<string, boolean>)[k] = root.querySelector<HTMLInputElement>(`[data-f="${k}"]`)?.checked ?? false;
		}
		def.footerText = root.querySelector<HTMLTextAreaElement>('#t-footer')?.value ?? '';
		(def as unknown as Record<string, string>).introText = root.querySelector<HTMLTextAreaElement>('#t-intro')?.value ?? '';
		(def as unknown as Record<string, string>).closingText = root.querySelector<HTMLTextAreaElement>('#t-closing')?.value ?? '';
		(def as unknown as Record<string, string>).signatureName = root.querySelector<HTMLInputElement>('#t-sign')?.value ?? '';
		(def as unknown as Record<string, string>).headerExtra = root.querySelector<HTMLInputElement>('#t-hextra')?.value ?? '';
		if (def.logo) {
			def.logo.position = (root.querySelector<HTMLSelectElement>('#t-lpos')?.value ?? 'right') as 'left' | 'right' | 'center';
			def.logo.widthMm = Number(root.querySelector<HTMLInputElement>('#t-lw')?.value ?? 30);
		}
		try {
			let id = editing.id;
			if (id === 'neu') {
				const res = await apiFetch('/api/templates', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: def.name, definition: def }),
				});
				if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Speichern fehlgeschlagen');
				id = ((await res.json()) as Template).id;
			} else {
				const res = await apiFetch(`/api/templates/${id}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: def.name, definition: def }),
				});
				if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Speichern fehlgeschlagen');
			}
			const file = root.querySelector<HTMLInputElement>('#t-logo')?.files?.[0];
			if (file) {
				const dataBase64 = await new Promise<string>((resolve, reject) => {
					const r = new FileReader();
					r.onload = () => resolve(String(r.result).split(',')[1]);
					r.onerror = () => reject(new Error('Datei nicht lesbar'));
					r.readAsDataURL(file);
				});
				const res = await apiFetch(`/api/templates/${id}/logo`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ filename: file.name, mime: file.type, dataBase64 }),
				});
				if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Logo-Upload fehlgeschlagen');
			}
			editing = null;
			error = '';
			await reload();
		} catch (e) {
			error = (e as Error).message;
			render();
		}
	}

	try {
		await reload();
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}
}
