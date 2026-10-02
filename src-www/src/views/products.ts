import { api, esc, type Product } from '../api';
import { t } from '../i18n';

/**
 * Products page: catalog of positions, products and services.
 *
 * @param root
 */
export async function products(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Positionen…')}</div>`;
	let items: Product[] = [];
	let editing: Product | null = null;
	let isNew = false;
	let message = '';
	let isError = false;

	async function reload(): Promise<void> {
		items = await api.products.list();
		render();
	}

	function formHtml(p: Partial<Product>): string {
		const text = (v: string | number | undefined): string => esc(v ?? '');
		return `
		<div class="grid2">
			<label>${t('Art.Nr.')}<input id="p-sku" value="${text(p.sku)}" /></label>
			<label>${t('Bezeichnung')}<input id="p-name" value="${text(p.name)}" /></label>
		</div>
		<label>${t('Detailzeile')}<textarea id="p-details" rows="1">${text(p.details)}</textarea></label>
		<div class="grid2">
			<label>${t('Einheit')}<input id="p-unit" value="${text(p.unit || 'Stk')}" /></label>
			<label>${t('Preis netto')}<input id="p-price" type="number" min="0" step="0.01" value="${p.unitPriceNet ?? 0}" /></label>
		</div>
		<label>${t('USt %')}<select id="p-vat">
			${[19, 7, 0].map(r => `<option ${r === (p.vatRate ?? 19) ? 'selected' : ''}>${r}</option>`).join('')}
		</select></label>`;
	}

	function render(): void {
		root.innerHTML = `
		<div class="card"><div class="row"><strong>${t('Positionen')}</strong>
			<button id="p-new">${t('+ Neu')}</button></div>
			<p class="muted">${t('Produkte und Dienstleistungen für die Rechnungsstellung.')}</p>
			${
				items
					.map(
						p => `<div class="row" style="margin-top:8px">
				<strong>${esc(p.sku ? `${p.sku} · ` : '')}${esc(p.name)}</strong>
				<span class="muted">${esc(p.unit)} · ${Number(p.unitPriceNet).toFixed(2)} EUR · ${p.vatRate} %</span>
				<button class="secondary" data-edit="${p.id}">${t('Bearbeiten')}</button>
				<button class="danger" data-del="${p.id}">${t('Löschen')}</button>
			</div>`,
					)
					.join('') || `<p class="muted">${t('Noch keine Positionen.')}</p>`
			}
		</div>
		${
			editing || isNew
				? `<div class="card"><h3>${isNew ? t('Neue Position') : esc(editing?.name ?? '')}</h3>
			${formHtml(editing ?? {})}
			${message ? `<p class="${isError ? 'error' : ''}">${esc(message)}</p>` : ''}
			<div class="row"><button id="p-save">${t('Speichern')}</button><button class="secondary" id="p-cancel">${t('Abbrechen')}</button></div>
		</div>`
				: ''
		}`;

		root.querySelector('#p-new')?.addEventListener('click', () => {
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
				if (!window.confirm(t('Position wirklich löschen?'))) {
					return;
				}
				try {
					await api.products.remove((b as HTMLElement).dataset.del ?? '');
					await reload();
				} catch (e) {
					message = (e as Error).message;
					isError = true;
					render();
				}
			}),
		);
		root.querySelector('#p-cancel')?.addEventListener('click', () => {
			editing = null;
			isNew = false;
			message = '';
			render();
		});
		root.querySelector('#p-save')?.addEventListener('click', () => void save());
	}

	function readForm(): {
		sku: string;
		name: string;
		details: string;
		unit: string;
		unitPriceNet: number;
		vatRate: number;
	} {
		return {
			sku: root.querySelector<HTMLInputElement>('#p-sku')?.value.trim() ?? '',
			name: root.querySelector<HTMLInputElement>('#p-name')?.value.trim() ?? '',
			details: root.querySelector<HTMLTextAreaElement>('#p-details')?.value.trim() ?? '',
			unit: root.querySelector<HTMLInputElement>('#p-unit')?.value.trim() || 'Stk',
			unitPriceNet: Number(root.querySelector<HTMLInputElement>('#p-price')?.value ?? 0),
			vatRate: Number(root.querySelector<HTMLSelectElement>('#p-vat')?.value ?? 19),
		};
	}

	async function save(): Promise<void> {
		const item = readForm();
		try {
			if (isNew) {
				await api.products.create(item);
			} else if (editing) {
				await api.products.update(editing.id, item);
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
