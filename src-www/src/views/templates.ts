import { apiFetch, esc, fileToBase64 } from '../api';
import { t } from '../i18n';

interface Template {
	id: string;
	name: string;
	version: number;
	definition: Record<string, unknown> & {
		name: string;
		companyId?: string;
		colors: { primary: string; text: string; muted: string };
		usePrimaryColor?: boolean;
		titleAccent?: boolean;
		tableHeaderAccent?: boolean;
		showEmail: boolean;
		showCustomerNumber: boolean;
		showPaymentTerms: boolean;
		footerText: string;
		showArchiveHint: boolean;
		showPageNumbers: boolean;
		showFooterBoxes: boolean;
		showTagline: boolean;
		introText: string;
		closingText: string;
		signatureName: string;
		headerExtra: string;
		blocks: Record<string, boolean>;
		logo?: { path: string; position: string; widthMm: number; allPages?: boolean };
		/** Distance of the logo's top edge from the top of the sheet in mm (empty = 12.7). */
		logoTopMm?: number | null;
		/** Distance of the header text from the top of the sheet in mm (empty = below the logo). */
		textTopMm?: number | null;
	};
	isDefault: boolean;
}

const LOCKED = ['title', 'meta', 'parties', 'positions', 'totals'];
const FREE = ['payment', 'notes'];

/** Logo placement options, labelled in the language in use. */
const logoPositions = (): { value: 'left' | 'center' | 'right'; label: string }[] => [
	{ value: 'right', label: t('rechts') },
	{ value: 'left', label: t('links') },
	{ value: 'center', label: t('zentriert') },
];

/**
 * Layout studio: list, edit, logo upload, PDF preview.
 *
 * @param root - Element the page is rendered into.
 */
export async function templates(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Vorlagen…')}</div>`;
	let items: Template[] = [];
	let editing: Template | null = null;
	let error = '';
	// R7.9: which sample document the test print uses (full invoice, small business, credit note)
	let sample = 'full';
	let companies: { id: string; name: string }[] = [];
	try {
		const res = await apiFetch('/api/company-profiles');
		if (res.ok) {
			companies = (await res.json()) as { id: string; name: string }[];
		}
	} catch {
		// company link stays optional
	}

	async function reload(): Promise<void> {
		items = await apiList();
		render();
	}

	async function apiList(): Promise<Template[]> {
		const res = await apiFetch('/api/templates');
		if (!res.ok) {
			throw new Error(t('Vorlagen konnten nicht geladen werden'));
		}
		return (await res.json()) as Template[];
	}

	function formHtml(tpl: Template): string {
		const d = tpl.definition;
		const check = (key: string, label: string, locked: boolean): string =>
			`<label><input type="checkbox" data-f="blocks.${key}" ${d.blocks[key] ? 'checked' : ''} ${
				locked ? 'disabled' : ''
			} style="width:auto" /> ${label}${locked ? ` (${t('Pflicht')})` : ''}</label>`;
		return `
		<label>${t('Name')}<input id="t-name" value="${esc(tpl.name)}" /></label>
		<label>${t('Verknüpfte Firma (für Vorschau)')}<select id="t-company">
			<option value="">${t('– Musterfirma –')}</option>
			${companies.map(c => `<option value="${esc(c.id)}" ${tpl.definition.companyId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
		</select></label>
		<div class="grid2">
			<label>${t('Primärfarbe')}<input id="t-c1" type="color" value="${esc(d.colors.primary)}" /></label>
			<label>${t('Textfarbe')}<input id="t-c2" type="color" value="${esc(d.colors.text)}" /></label>
		</div>
		<label class="pay" title="${t('Aus: das Dokument bleibt schwarz/weiß, die Primärfarbe wird nirgends verwendet')}">
			<input type="checkbox" data-f="usePrimaryColor" ${d.usePrimaryColor !== false ? 'checked' : ''} /><span>${t('Primärfarbe verwenden')}</span>
		</label>
		<label class="pay" title="${t('Ohne Haken: der Titel wird in der Textfarbe gesetzt')}">
			<input type="checkbox" data-f="titleAccent" ${d.titleAccent !== false ? 'checked' : ''} /><span>${t('Rechnungstitel in Akzentfarbe')}</span>
		</label>
		<label class="pay" title="${t('Ohne Haken: nur die linke Hälfte der Kopfzeile ist eingefärbt, die rechte bleibt grau')}">
			<input type="checkbox" data-f="tableHeaderAccent" ${d.tableHeaderAccent === true ? 'checked' : ''} /><span>${t('Tabellenkopf komplett in Akzentfarbe')}</span>
		</label>
		${LOCKED.map(k => check(k, t('Block {name}', { name: k }), true)).join('')}
		${FREE.map(k => check(k, t('Block {name}', { name: k }), false)).join('')}
		<label><input type="checkbox" data-f="showEmail" ${d.showEmail ? 'checked' : ''} style="width:auto" /> ${t('E-Mail im Kopf')}</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${d.showCustomerNumber ? 'checked' : ''} style="width:auto" /> ${t('Kundennr. (BT-10)')}</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${d.showPaymentTerms ? 'checked' : ''} style="width:auto" /> ${t('Zahlungsbedingungen')}</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${d.showArchiveHint ? 'checked' : ''} style="width:auto" /> ${t('§14b-Archivhinweis')}</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${d.showFooterBoxes !== false ? 'checked' : ''} style="width:auto" /> ${t('Firmen-Fußzeile (4 Boxen)')}</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${d.showPageNumbers ? 'checked' : ''} style="width:auto" /> ${t('Seitenzahlen (ab 2 Seiten)')}</label>
		<label><input type="checkbox" data-f="showTagline" ${d.showTagline !== false ? 'checked' : ''} style="width:auto" /> ${t('Adress-Tagline')}</label>
		<label>${t('Einleitungssatz')}<textarea id="t-intro">${esc(d.introText ?? '')}</textarea></label>
		<label>${t('Schlusssatz')}<textarea id="t-closing">${esc(d.closingText ?? '')}</textarea></label>
		<div class="grid2">
			<label title="${t('Leer lassen: es wird kein Name gedruckt')}">${t('Unterschrift (Name, optional)')}<input id="t-sign" value="${esc(d.signatureName ?? '')}" /></label>
			<label>${t('Kopfzusatz (z.B. Geschäftsführer)')}<input id="t-hextra" value="${esc(d.headerExtra ?? '')}" /></label>
		</div>
		<label>${t('Fußzeile')}<textarea id="t-footer">${esc(d.footerText)}</textarea></label>
		<div class="grid2">
			<label>${t('Logo-Position')}<select id="t-lpos">
				${logoPositions()
					.map(
						p =>
							`<option value="${p.value}" ${d.logo?.position === p.value ? 'selected' : ''}>${p.label}</option>`,
					)
					.join('')}
			</select></label>
			<label>${t('Logo-Breite (mm)')}<input id="t-lw" type="number" min="10" max="500" value="${d.logo?.widthMm ?? 30}" /></label>
		</div>
		<div class="grid2">
			<label title="${t('Abstand der Oberkante des Logos vom oberen Blattrand. Leer = 12,7 mm (bisheriger Wert).')}">${t('Logo-Abstand oben (mm)')}<input id="t-ltop" type="number" min="0" max="150" step="0.5" value="${d.logoTopMm ?? ''}" placeholder="12,7" /></label>
			<label title="${t('Abstand des Textes (Absenderzeile, Empfänger, Rechnungsdaten) vom oberen Blattrand. Leer = direkt unter dem Logo.')}">${t('Text-Abstand oben (mm)')}<input id="t-ttop" type="number" min="0" max="150" step="0.5" value="${d.textTopMm ?? ''}" placeholder="${t('automatisch')}" /></label>
		</div>
		<label class="pay" title="${t('Ohne Haken erscheint das Logo nur auf der ersten Seite')}">
			<input type="checkbox" id="t-lall" ${d.logo?.allPages ? 'checked' : ''} /><span>${t('Logo auf allen Seiten anzeigen')}</span>
		</label>
		<label>${t('Logo (PNG/JPEG, max. 2 MB)')}<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${d.logo ? `<p class="muted">${t('Aktuell')}: ${esc(d.logo.path)}</p>` : ''}`;
	}

	function render(): void {
		root.innerHTML = `
		<div class="card"><div class="row"><strong>${t('Druckvorlagen')}</strong>
			<button id="t-new">${t('+ Neu')}</button>
			<label>${t('Probedruck mit')}<select id="t-sample">
				<option value="full" ${sample === 'full' ? 'selected' : ''}>${t('Vollrechnung')}</option>
				<option value="small" ${sample === 'small' ? 'selected' : ''}>${t('Kleinbetrag (§ 19 UStG)')}</option>
				<option value="credit" ${sample === 'credit' ? 'selected' : ''}>${t('Gutschrift')}</option>
			</select></label></div>
			<p class="muted">${t(
				'Aussehen der PDF-Rechnung: Logo, Farben, Kopf- und Fußzeilen. Die inhaltlichen Positionen legst du unter {templates} oder {items} fest.',
				{
					templates: `<a href="#/invoice-templates">${t('Rechnungsvorlagen')}</a>`,
					items: `<a href="#/products">${t('Positionen')}</a>`,
				},
			)}</p>
			${
				items
					.map(
						tpl => `<div class="row" style="margin-top:8px">
				<strong>${esc(tpl.name)}</strong><span class="muted">v${tpl.version}</span>
				${tpl.isDefault ? `<span class="badge issued">${t('Standard')}</span>` : ''}
				<button class="secondary" data-edit="${tpl.id}">${t('Bearbeiten')}</button>
				<button class="secondary" data-prev="${tpl.id}">${t('Vorschau')}</button>
				${tpl.isDefault ? '' : `<button class="secondary" data-def="${tpl.id}">${t('Standard')}</button>`}
				${tpl.isDefault ? '' : `<button class="danger" data-del="${tpl.id}">${t('Löschen')}</button>`}
			</div>`,
					)
					.join('') || `<p class="muted">${t('Noch keine Vorlagen.')}</p>`
			}
		</div>
		${
			editing
				? `<div class="card"><h3>${esc(editing.id === 'neu' ? t('Neue Vorlage') : editing.name)}</h3>${formHtml(editing)}
			${error ? `<p class="error">${esc(error)}</p>` : ''}
			<div class="row"><button id="t-save">${t('Speichern')}</button><button class="secondary" id="t-preview">${t('Vorschau (Entwurf)')}</button><button class="secondary" id="t-cancel">${t('Abbrechen')}</button></div>
		</div>`
				: ''
		}`;

		root.querySelector('#t-new')?.addEventListener('click', async () => {
			try {
				const res = await apiFetch('/api/templates');
				const list = (await res.json()) as Template[];
				const first = list[0];
				if (!first) {
					error = t('Keine Basisvorlage vorhanden');
					render();
					return;
				}
				editing = { ...structuredClone(first), id: 'neu', name: 'Neu', version: 1, isDefault: false };
				error = '';
				render();
			} catch (e) {
				error = (e as Error).message;
				render();
			}
		});
		root.querySelectorAll('[data-edit]').forEach(b =>
			b.addEventListener('click', () => {
				const tpl = items.find(x => x.id === (b as HTMLElement).dataset.edit);
				if (tpl) {
					editing = structuredClone(tpl);
					error = '';
					render();
				}
			}),
		);
		root.querySelectorAll('[data-prev]').forEach(b =>
			b.addEventListener('click', async () => {
				const tpl = items.find(x => x.id === (b as HTMLElement).dataset.prev);
				if (!tpl) {
					return;
				}
				try {
					const res = await apiFetch('/api/templates/preview', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ definition: tpl.definition, sample }),
					});
					if (!res.ok) {
						const j = (await res.json().catch(() => ({}))) as { error?: string };
						throw new Error(j.error ?? t('Vorschau fehlgeschlagen'));
					}
					const blob = await res.blob();
					window.open(URL.createObjectURL(blob), '_blank');
				} catch (e) {
					error = (e as Error).message;
					render();
				}
			}),
		);
		root.querySelectorAll('[data-def]').forEach(b =>
			b.addEventListener('click', async () => {
				try {
					const res = await apiFetch(`/api/templates/${(b as HTMLElement).dataset.def}/default`, {
						method: 'POST',
					});
					if (!res.ok) {
						throw new Error(t('Umschalten fehlgeschlagen'));
					}
					editing = null;
					await reload();
				} catch (e) {
					error = (e as Error).message;
					render();
				}
			}),
		);
		root.querySelectorAll('[data-del]').forEach(b =>
			b.addEventListener('click', async () => {
				const res = await apiFetch(`/api/templates/${(b as HTMLElement).dataset.del}`, { method: 'DELETE' });
				if (!res.ok) {
					const j = (await res.json().catch(() => ({}))) as { error?: string };
					error = j.error ?? t('Löschen fehlgeschlagen');
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
		root.querySelector('#t-sample')?.addEventListener('change', event => {
			sample = (event.target as HTMLSelectElement).value;
		});
		root.querySelector('#t-save')?.addEventListener('click', () => void save());
		root.querySelector('#t-preview')?.addEventListener('click', async () => {
			const collected = collectForm();
			if (!collected) {
				return;
			}
			try {
				const res = await apiFetch('/api/templates/preview', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ definition: collected.definition, sample }),
				});
				if (!res.ok) {
					const j = (await res.json().catch(() => ({}))) as { error?: string };
					throw new Error(j.error ?? t('Vorschau fehlgeschlagen'));
				}
				window.open(URL.createObjectURL(await res.blob()), '_blank');
			} catch (e) {
				error = (e as Error).message;
				render();
			}
		});
	}

	/** Reads the edit form into a definition (used by save + draft preview). */
	function collectForm(): { name: string; definition: Template['definition'] } | null {
		if (!editing) {
			return null;
		}
		const def = structuredClone(editing.definition);
		def.name = (root.querySelector<HTMLInputElement>('#t-name')?.value ?? def.name).trim();
		def.colors.primary = root.querySelector<HTMLInputElement>('#t-c1')?.value ?? def.colors.primary;
		def.colors.text = root.querySelector<HTMLInputElement>('#t-c2')?.value ?? def.colors.text;
		for (const k of FREE) {
			def.blocks[k] = root.querySelector<HTMLInputElement>(`[data-f="blocks.${k}"]`)?.checked ?? def.blocks[k];
		}
		for (const k of [
			'showEmail',
			'showCustomerNumber',
			'showPaymentTerms',
			'showArchiveHint',
			'showPageNumbers',
			'showTagline',
			'showFooterBoxes',
		] as const) {
			(def as unknown as Record<string, boolean>)[k] =
				root.querySelector<HTMLInputElement>(`[data-f="${k}"]`)?.checked ?? false;
		}
		// Accent switches: missing element must not silently disable them, the
		// renderer treats undefined as "use the default (on)".
		for (const k of ['usePrimaryColor', 'titleAccent', 'tableHeaderAccent'] as const) {
			const box = root.querySelector<HTMLInputElement>(`[data-f="${k}"]`);
			if (box) {
				(def as unknown as Record<string, boolean>)[k] = box.checked;
			}
		}
		def.footerText = root.querySelector<HTMLTextAreaElement>('#t-footer')?.value ?? '';
		const formCompany = root.querySelector<HTMLSelectElement>('#t-company')?.value ?? '';
		if (formCompany) {
			(def as unknown as Record<string, string>).companyId = formCompany;
		} else {
			// same rule: unlinking the company has to be sent, a missing key would keep the link
			(def as unknown as Record<string, unknown>).companyId = null;
		}
		(def as unknown as Record<string, string>).introText =
			root.querySelector<HTMLTextAreaElement>('#t-intro')?.value ?? '';
		(def as unknown as Record<string, string>).closingText =
			root.querySelector<HTMLTextAreaElement>('#t-closing')?.value ?? '';
		(def as unknown as Record<string, string>).signatureName =
			root.querySelector<HTMLInputElement>('#t-sign')?.value ?? '';
		(def as unknown as Record<string, string>).headerExtra =
			root.querySelector<HTMLInputElement>('#t-hextra')?.value ?? '';
		// the two header distances: empty means "as before". `null` (not a missing key) is what
		// tells the server to drop a value stored earlier — an update only merges what it receives.
		for (const [id, key] of [
			['#t-ltop', 'logoTopMm'],
			['#t-ttop', 'textTopMm'],
		] as const) {
			const text = root.querySelector<HTMLInputElement>(id)?.value.trim().replace(',', '.') ?? '';
			const value = Number(text);
			if (text !== '' && Number.isFinite(value)) {
				def[key] = value;
			} else {
				def[key] = null;
			}
		}
		if (def.logo) {
			def.logo.position = root.querySelector<HTMLSelectElement>('#t-lpos')?.value ?? 'right';
			def.logo.widthMm = Number(root.querySelector<HTMLInputElement>('#t-lw')?.value ?? 30);
			def.logo.allPages = root.querySelector<HTMLInputElement>('#t-lall')?.checked === true;
		}
		return { name: def.name, definition: def };
	}

	async function save(): Promise<void> {
		const collected = collectForm();
		if (!collected) {
			return;
		}
		const def = collected.definition;
		try {
			let id = editing!.id;
			if (id === 'neu') {
				const res = await apiFetch('/api/templates', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: def.name, definition: def }),
				});
				if (!res.ok) {
					throw new Error(
						((await res.json().catch(() => ({}))) as { error?: string }).error ??
							t('Speichern fehlgeschlagen'),
					);
				}
				id = ((await res.json()) as Template).id;
			} else {
				const res = await apiFetch(`/api/templates/${id}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: def.name, definition: def }),
				});
				if (!res.ok) {
					throw new Error(
						((await res.json().catch(() => ({}))) as { error?: string }).error ??
							t('Speichern fehlgeschlagen'),
					);
				}
			}
			const file = root.querySelector<HTMLInputElement>('#t-logo')?.files?.[0];
			if (file) {
				const dataBase64 = await fileToBase64(file);
				const res = await apiFetch(`/api/templates/${id}/logo`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ filename: file.name, mime: file.type, dataBase64 }),
				});
				if (!res.ok) {
					throw new Error(
						((await res.json().catch(() => ({}))) as { error?: string }).error ??
							t('Logo-Upload fehlgeschlagen'),
					);
				}
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
