import { api, esc, type CompanyProfile, type Party } from '../api';
import { locale, t } from '../i18n';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });

/** Sort modes offered in the customers list. */
type SortKey = 'name-asc' | 'name-desc' | 'number-asc' | 'number-desc';

/** The sort options in the language in use (built per call, the language is known at start-up). */
const sortOptions = (): { value: SortKey; label: string }[] => [
	{ value: 'name-asc', label: t('Name A–Z') },
	{ value: 'name-desc', label: t('Name Z–A') },
	{ value: 'number-asc', label: t('Nummer aufsteigend') },
	{ value: 'number-desc', label: t('Nummer absteigend') },
];

/**
 * Compares two customer numbers: numerically when both end in digits
 * (K-00002 before K-00010), alphabetically otherwise (KD-4711).
 *
 * @param a - First value.
 * @param b - Second value.
 */
function compareNumbers(a: string, b: string): number {
	const na = Number(a.replace(/\D+/g, ''));
	const nb = Number(b.replace(/\D+/g, ''));
	const aHas = /\d/.test(a) && Number.isFinite(na);
	const bHas = /\d/.test(b) && Number.isFinite(nb);
	if (aHas && bHas && na !== nb) {
		return na - nb;
	}
	return a.localeCompare(b, locale());
}

function sortCustomers(items: CompanyProfile[], sort: SortKey): CompanyProfile[] {
	const dir = sort.endsWith('desc') ? -1 : 1;
	const sorted = [...items];
	sorted.sort((x, y) => {
		if (sort.startsWith('number')) {
			return compareNumbers(x.profile.customerNumber?.trim() ?? '', y.profile.customerNumber?.trim() ?? '') * dir;
		}
		return x.name.localeCompare(y.name, locale()) * dir;
	});
	return sorted;
}

function field(obj: Party, key: keyof Party, label: string): string {
	const value = obj[key];
	const text = Array.isArray(value) ? value.join('\n') : (value ?? '');
	return `<label>${label}<input data-f="${key}" value="${esc(text)}" /></label>`;
}

/**
 * Customers page: buyer master data list, create, edit, delete.
 *
 * @param root - Element the page is rendered into.
 */
export async function customers(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Kunden…')}</div>`;
	let items: CompanyProfile[] = [];
	let editing: CompanyProfile | null = null;
	let isNew = false;
	let message = '';
	let isError = false;
	let sort: SortKey = 'name-asc';
	/** Current search term; the server tolerates typos in it. */
	let search = '';

	async function reload(): Promise<void> {
		items = await api.customers.list(search || undefined);
		render();
	}

	function formHtml(p: Party, name: string): string {
		return `
		<label>${t('Name (Anzeige)')}<input id="k-name" value="${esc(name)}" /></label>
		${field(p, 'name', t('Firmenname'))}
		${field(p, 'street', t('Straße'))}
		<div class="grid2">${field(p, 'zip', t('PLZ'))}${field(p, 'city', t('Ort'))}</div>
		<div class="grid2">${field(p, 'country', t('Land'))}${field(p, 'email', t('E-Mail'))}</div>
		<div class="grid2">${field(p, 'phone', t('Telefon'))}${field(p, 'contactName', t('Ansprechpartner'))}</div>
		<label>${t('Kundennr. (BT-10)')}<input data-f="customerNumber" value="${esc(p.customerNumber)}" placeholder="${t('wird beim Speichern automatisch vergeben')}" /></label>
		<label>${t('Leitweg-ID (nur für öffentliche Auftraggeber)')}<input data-f="leitwegId" value="${esc(p.leitwegId)}" placeholder="${t('z. B. 04011000-12345-67')}" /></label>`;
	}

	function render(): void {
		const missing = items.filter(c => !c.profile.customerNumber?.trim()).length;
		const visible = sortCustomers(items, sort);
		root.innerHTML = `
		<div class="card"><div class="row"><strong>${t('Kunden')}</strong>
			<input id="k-q" placeholder="${t('Suche (Name, Nummer, Ort)…')}" value="${esc(search)}" style="max-width:240px" />
			<button id="k-new">${t('+ Neu')}</button>
			<label class="sortsel">${t('Sortieren')}<select id="k-sort">
				${sortOptions()
					.map(o => `<option value="${o.value}" ${o.value === sort ? 'selected' : ''}>${o.label}</option>`)
					.join('')}
			</select></label>
			${missing > 0 ? `<button class="secondary" id="k-number">${t('{n} ohne Nummer: automatisch vergeben', { n: missing })}</button>` : ''}
		</div>
			${
				visible
					.map(
						c => `<div class="row" style="margin-top:8px">
				<strong>${esc(c.name)}</strong>
				${c.profile.customerNumber?.trim() ? `<span class="badge">${esc(c.profile.customerNumber)}</span>` : `<span class="badge cancelled">${t('keine Nummer')}</span>`}
				<span class="muted">${esc(c.profile.city || '')}</span>
				<button class="secondary" data-edit="${c.id}">${t('Bearbeiten')}</button>
				<button class="danger" data-del="${c.id}">${t('Löschen')}</button>
			</div>`,
					)
					.join('') || `<p class="muted">${t('Noch keine Kunden.')}</p>`
			}
			<p class="muted">${t('{n} Kunden', { n: visible.length })}</p>
		</div>
		${
			editing || isNew
				? `<div class="card"><h3>${isNew ? t('Neuer Kunde') : esc(editing?.name ?? '')}</h3>
			${formHtml(editing?.profile ?? emptyParty(), editing?.name ?? '')}
			${message ? `<p class="${isError ? 'error' : ''}">${esc(message)}</p>` : ''}
			<div class="row"><button id="k-save">${t('Speichern')}</button><button class="secondary" id="k-cancel">${t('Abbrechen')}</button></div>
		</div>`
				: ''
		}`;

		root.querySelector('#k-sort')?.addEventListener('change', event => {
			sort = (event.target as HTMLSelectElement).value as SortKey;
			render();
		});
		// The search runs on the server so typos and case differences still hit.
		let searchTimer: ReturnType<typeof setTimeout> | undefined;
		root.querySelector('#k-q')?.addEventListener('input', event => {
			search = (event.target as HTMLInputElement).value;
			if (searchTimer !== undefined) {
				clearTimeout(searchTimer);
			}
			searchTimer = setTimeout(() => void reload(), 250);
		});
		root.querySelector('#k-number')?.addEventListener('click', async () => {
			try {
				const result = await api.customers.assignNumbers();
				message = t('{n} Kundennummer(n) vergeben.', { n: result.updated });
				isError = false;
				await reload();
			} catch (e) {
				message = (e as Error).message;
				isError = true;
				render();
			}
		});

		root.querySelector('#k-new')?.addEventListener('click', () => {
			editing = null;
			isNew = true;
			message = '';
			render();
		});
		root.querySelectorAll('[data-edit]').forEach(b =>
			b.addEventListener('click', () => {
				editing = items.find(x => x.id === (b as HTMLElement).dataset.edit) ?? null;
				isNew = false;
				message = '';
				render();
			}),
		);
		root.querySelectorAll('[data-del]').forEach(b =>
			b.addEventListener('click', async () => {
				if (!window.confirm(t('Kunden wirklich löschen?'))) {
					return;
				}
				try {
					await api.customers.remove((b as HTMLElement).dataset.del ?? '');
					await reload();
				} catch (e) {
					message = (e as Error).message;
					isError = true;
					render();
				}
			}),
		);
		root.querySelector('#k-cancel')?.addEventListener('click', () => {
			editing = null;
			isNew = false;
			message = '';
			render();
		});
		root.querySelector('#k-save')?.addEventListener('click', () => void save());
	}

	async function save(): Promise<void> {
		const profile: Party = { ...emptyParty() };
		root.querySelectorAll<HTMLInputElement>('input[data-f]').forEach(el => {
			(profile as unknown as Record<string, string>)[el.dataset.f!] = el.value;
		});
		const name = root.querySelector<HTMLInputElement>('#k-name')?.value.trim() || profile.name.trim() || 'Kunde';
		try {
			if (isNew) {
				await api.customers.create(name, profile);
			} else if (editing) {
				await api.customers.update(editing.id, { name, profile });
			}
			editing = null;
			isNew = false;
			message = '';
			await reload();
		} catch (e) {
			message = (e as Error).message;
			isError = true;
			render();
		}
	}

	try {
		await reload();
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}
}
