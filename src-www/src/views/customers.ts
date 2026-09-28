import { api, esc, type CompanyProfile, type Party } from '../api';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });

function field(obj: Party, key: keyof Party, label: string): string {
	const value = obj[key];
	const text = Array.isArray(value) ? value.join('\n') : (value ?? '');
	return `<label>${label}<input data-f="${key}" value="${esc(text)}" /></label>`;
}

/** Customers page: buyer master data list, create, edit, delete. */
export async function customers(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">Lade Kunden…</div>`;
	let items: CompanyProfile[] = [];
	let editing: CompanyProfile | null = null;
	let isNew = false;
	let message = '';
	let isError = false;

	async function reload(): Promise<void> {
		items = await api.customers.list();
		render();
	}

	function formHtml(p: Party, name: string): string {
		return `
		<label>Name (Anzeige)<input id="k-name" value="${esc(name)}" /></label>
		${field(p, 'name', 'Firmenname')}
		${field(p, 'street', 'Straße')}
		<div class="grid2">${field(p, 'zip', 'PLZ')}${field(p, 'city', 'Ort')}</div>
		<div class="grid2">${field(p, 'country', 'Land')}${field(p, 'email', 'E-Mail')}</div>
		<div class="grid2">${field(p, 'phone', 'Telefon')}${field(p, 'contactName', 'Ansprechpartner')}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${esc(p.customerNumber)}" /></label>`;
	}

	function render(): void {
		root.innerHTML = `
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${items
				.map(
					c => `<div class="row" style="margin-top:8px">
				<strong>${esc(c.name)}</strong>
				<span class="muted">${esc(c.profile.city || '')}</span>
				<button class="secondary" data-edit="${c.id}">Bearbeiten</button>
				<button class="danger" data-del="${c.id}">Löschen</button>
			</div>`,
				)
				.join('') || '<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${editing || isNew ? `<div class="card"><h3>${isNew ? 'Neuer Kunde' : esc(editing?.name ?? '')}</h3>
			${formHtml(editing?.profile ?? emptyParty(), editing?.name ?? '')}
			${message ? `<p class="${isError ? 'error' : ''}">${esc(message)}</p>` : ''}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>` : ''}`;

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
				if (!window.confirm('Kunden wirklich löschen?')) return;
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
