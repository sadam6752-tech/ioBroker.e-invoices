import { api, esc, eur, type Product, type InvoiceTemplate } from '../api';

/** One line of a template preview. */
interface TemplateLine {
	description: string;
	quantity: number;
	unit: string;
	unitPriceNet: number;
	vatRate: number;
	discountPercent?: number;
}

/** Reads the reusable content out of a stored template body. */
function readBody(body: Record<string, unknown>): {
	lines: TemplateLine[];
	paymentTerms: string;
	skontoPercent: number;
	notes: string;
} {
	const rawLines = Array.isArray(body.lines) ? (body.lines as TemplateLine[]) : [];
	return {
		lines: rawLines.filter(l => l && typeof l.description === 'string' && l.description.trim() !== ''),
		paymentTerms: typeof body.paymentTerms === 'string' ? body.paymentTerms : '',
		skontoPercent: Number(body.skontoPercent) || 0,
		notes: typeof body.notes === 'string' ? body.notes : '',
	};
}

/** Net sum of a template, shown so the user recognises what they saved. */
function netOf(lines: TemplateLine[]): number {
	return lines.reduce((sum, l) => {
		const discount = Math.min(Math.max(Number(l.discountPercent) || 0, 0), 100);
		const gross = (Number(l.quantity) || 0) * (Number(l.unitPriceNet) || 0);
		return sum + gross * (1 - discount / 100);
	}, 0);
}

/** A line as a form row, so it can be saved back. */
function lineRow(l: TemplateLine, i: number, vatRates: number[]): string {
	return `<div class="card line" style="background:var(--bg)">
		<div class="line-head"><span class="line-no">${i + 1}</span><strong>Position ${i + 1}</strong>
			<button class="secondary" data-tpl-del-line="${i}">Entfernen</button></div>
		<div class="grid2">
			<label>Bezeichnung<input data-tpl-line="${i}.description" value="${esc(l.description)}" /></label>
			<label>Art.Nr.<input data-tpl-line="${i}.sku" value="${esc((l as { sku?: string }).sku ?? '')}" /></label>
		</div>
		<div class="grid2">
			<label>Menge<input data-tpl-line="${i}.quantity" type="number" min="0" step="any" value="${esc(l.quantity)}" /></label>
			<label>Einheit<input data-tpl-line="${i}.unit" value="${esc(l.unit)}" /></label>
		</div>
		<div class="grid2">
			<label>Preis netto<input data-tpl-line="${i}.unitPriceNet" type="number" min="0" step="0.01" value="${esc(l.unitPriceNet)}" /></label>
			<label>USt %<select data-tpl-line="${i}.vatRate">
				${vatRates.map(r => `<option ${Number(r) === Number(l.vatRate) ? 'selected' : ''}>${r}</option>`).join('')}
			</select></label>
		</div>
	</div>`;
}

const VAT_RATES = [19, 7, 0];

/**
 * Invoice content templates: recurring maintenance, flat fees, subscriptions.
 * They carry positions, terms, notes and cash discount — never the customer
 * and never a date, because those differ per invoice.
 */
export async function invoiceTemplates(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">Lade Rechnungsvorlagen…</div>`;
	let items: InvoiceTemplate[] = [];
	/** Catalog lines offered next to "add position". */
	let catalog: Product[] = [];
	/** Template being edited, null while a new one is being created. */
	let editing: InvoiceTemplate | null = null;
	/**
	 * Whether the editor form is open. This is deliberately separate from
	 * `editing`: a new template has no id yet, so `editing` is null and binding
	 * the form to it would hide the form for exactly the "+ Neue Vorlage" case.
	 */
	let formOpen = false;
	let draftLines: TemplateLine[] = [];
	let draftTerms = '';
	let draftSkonto = 0;
	let draftNotes = '';
	let message = '';
	let isError = false;

	async function reload(): Promise<void> {
		items = await api.invoiceTemplates.list();
		render();
	}

	/** Catalog is a convenience, so a failure must not break the page. */
	async function loadCatalog(): Promise<void> {
		try {
			catalog = await api.products.list();
			if (formOpen) {
				render();
			}
		} catch {
			catalog = [];
		}
	}

	function startEdit(tpl: InvoiceTemplate | null): void {
		editing = tpl;
		formOpen = true;
		const body = readBody(tpl?.body ?? {});
		draftLines = body.lines.length ? body.lines.map(l => ({ ...l })) : [newLine()];
		draftTerms = body.paymentTerms;
		draftSkonto = body.skontoPercent;
		draftNotes = body.notes;
		message = '';
		isError = false;
		render();
	}

	function newLine(): TemplateLine {
		return { description: '', quantity: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 };
	}

	function collectLines(): TemplateLine[] {
		return draftLines.map((l, i) => {
			const pick = (key: string, fallback: string | number): string | number => {
				const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-tpl-line="${i}.${key}"]`);
				return el ? el.value : fallback;
			};
			return {
				description: String(pick('description', l.description)),
				sku: String(pick('sku', '')),
				quantity: Number(pick('quantity', l.quantity)) || 0,
				unit: String(pick('unit', l.unit)),
				unitPriceNet: Number(pick('unitPriceNet', l.unitPriceNet)) || 0,
				vatRate: Number(pick('vatRate', l.vatRate)) || 0,
			};
		});
	}

	function render(): void {
		const net = netOf(collectLines());
		root.innerHTML = `
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${message ? `<span class="${isError ? 'error' : 'muted'}">${esc(message)}</span>` : ''}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${
				items
					.map(t => {
						const b = readBody(t.body);
						return `<div class="row" style="margin-top:8px">
						<strong>${esc(t.name)}</strong>
						<span class="muted">${b.lines.length} Position(en) · ${eur(netOf(b.lines))}${b.skontoPercent ? ` · ${b.skontoPercent} % Skonto` : ''}</span>
						<button class="secondary" data-tpl-edit="${esc(t.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${esc(t.id)}">Löschen</button>
					</div>`;
					})
					.join('') || '<p class="muted">Noch keine Vorlagen.</p>'
			}
		</div>
		${
			formOpen
				? `<div class="card"><h3>${editing ? esc(editing.name) : 'Neue Vorlage'}</h3>
					<label>Name<input id="t-name" value="${esc(editing?.name ?? '')}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${esc(draftTerms)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${esc(draftSkonto)}" /></label>
						<label>&nbsp;</label>
					</div>
					<label>Notiz<textarea id="t-notes" rows="2">${esc(draftNotes)}</textarea></label>
					<p class="muted">Summe netto: <strong>${eur(net)}</strong></p>
					${
						catalog.length > 0
							? `<div class="row">
								<label style="flex:1">Aus dem Positionskatalog übernehmen<select id="t-catalog">
									<option value="">– Position wählen –</option>
									${catalog
										.map(
											p =>
												`<option value="${esc(p.id)}">${esc(p.sku ? `${p.sku} · ` : '')}${esc(p.name)} · ${eur(
													p.unitPriceNet,
												)}</option>`,
										)
										.join('')}
								</select></label>
								<button class="secondary" id="t-take" style="align-self:end">Position hinzufügen</button>
							</div>`
							: `<p class="muted">Unter <a href="#/products">Positionen</a> kannst du den Katalog pflegen.</p>`
					}
					${draftLines.map((l, i) => lineRow(l, i, VAT_RATES)).join('')}
					<button class="secondary" id="t-add-line">+ Leere Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`
				: ''
		}`;

		root.querySelector('#t-new')?.addEventListener('click', () => startEdit(null));
		root.querySelectorAll('[data-tpl-edit]').forEach(btn =>
			btn.addEventListener('click', () => {
				const t = items.find(x => x.id === (btn as HTMLElement).dataset.tplEdit);
				if (t) {
					startEdit(t);
				}
			}),
		);
		root.querySelectorAll('[data-tpl-del]').forEach(btn =>
			btn.addEventListener('click', async () => {
				if (!window.confirm('Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert.')) return;
				try {
					await api.invoiceTemplates.remove((btn as HTMLElement).dataset.tplDel ?? '');
					message = 'Vorlage gelöscht.';
					isError = false;
					await reload();
				} catch (e) {
					message = (e as Error).message;
					isError = true;
					render();
				}
			}),
		);
		root.querySelectorAll('[data-tpl-del-line]').forEach(btn =>
			btn.addEventListener('click', () => {
				const i = Number((btn as HTMLElement).dataset.tplDelLine);
				draftLines.splice(i, 1);
				if (draftLines.length === 0) {
					draftLines.push(newLine());
				}
				render();
			}),
		);
		root.querySelector('#t-take')?.addEventListener('click', () => {
			// Read the form back first, otherwise the catalog line would discard
			// edits the user just typed into the other rows.
			draftLines = collectLines();
			const id = root.querySelector<HTMLSelectElement>('#t-catalog')?.value ?? '';
			const found = catalog.find(p => p.id === id);
			if (!found) {
				return;
			}
			draftLines.push({
				description: found.name,
				sku: found.sku || undefined,
				details: found.details || undefined,
				quantity: 1,
				unit: found.unit,
				unitPriceNet: found.unitPriceNet,
				vatRate: found.vatRate,
			} as TemplateLine);
			render();
		});
		root.querySelector('#t-add-line')?.addEventListener('click', () => {
			draftLines = collectLines();
			draftLines.push(newLine());
			render();
		});
		root.querySelector('#t-cancel')?.addEventListener('click', () => {
			editing = null;
			formOpen = false;
			render();
		});
		root.querySelector('#t-save')?.addEventListener('click', async () => {
			const name = root.querySelector<HTMLInputElement>('#t-name')?.value.trim() ?? '';
			if (!name) {
				message = 'Bitte einen Namen vergeben.';
				isError = true;
				render();
				return;
			}
			const lines = collectLines().filter(l => l.description.trim() !== '');
			if (lines.length === 0) {
				message = 'Mindestens eine Position mit Bezeichnung nötig.';
				isError = true;
				render();
				return;
			}
			const body: Record<string, unknown> = {
				lines,
				paymentTerms: root.querySelector<HTMLInputElement>('#t-terms')?.value ?? '',
				skontoPercent: Number(root.querySelector<HTMLInputElement>('#t-skonto')?.value) || 0,
				notes: root.querySelector<HTMLTextAreaElement>('#t-notes')?.value ?? '',
			};
			try {
				if (editing?.id) {
					await api.invoiceTemplates.update(editing.id, { name, body });
				} else {
					await api.invoiceTemplates.create(name, body);
				}
				message = `Gespeichert: ${name}`;
				isError = false;
				editing = null;
				formOpen = false;
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
		void loadCatalog();
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}
}
