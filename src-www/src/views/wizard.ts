import { api, esc, eur, type DraftInput, type Invoice, type InvoiceLine, type Party } from '../api';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });

interface WizardState {
	step: number;
	seller: Party;
	buyer: Party;
	lines: InvoiceLine[];
	issueDate: string;
	deliveryDate: string;
	dueDate: string;
	documentTitle: string;
	notes: string;
	draftId: string | null;
	error: string;
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function partyFields(prefix: string, p: Party, withTax: boolean): string {
	return `
		<label>Name<input data-p="${prefix}" data-f="name" value="${esc(p.name)}" /></label>
		<label>Straße<input data-p="${prefix}" data-f="street" value="${esc(p.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${prefix}" data-f="zip" value="${esc(p.zip)}" /></label>
			<label>Ort<input data-p="${prefix}" data-f="city" value="${esc(p.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${prefix}" data-f="country" value="${esc(p.country)}" /></label>
			<label>E-Mail<input data-p="${prefix}" data-f="email" value="${esc(p.email)}" /></label>
		</div>
		${
			withTax
				? `<div class="grid2">
			<label>USt-IdNr.<input data-p="${prefix}" data-f="vatId" value="${esc(p.vatId)}" /></label>
			<label>Steuernummer<input data-p="${prefix}" data-f="taxNumber" value="${esc(p.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${prefix}" data-f="iban" value="${esc(p.iban)}" /></label>`
				: `<label>Kundennr. (BT-10)<input data-p="${prefix}" data-f="customerNumber" value="${esc(p.customerNumber)}" /></label>`
		}`;
}

/** Multi-step invoice wizard: seller -> buyer -> lines -> review/issue. */
export function wizard(root: HTMLElement): void {
	const s: WizardState = {
		step: 0,
		seller: emptyParty(),
		buyer: emptyParty(),
		lines: [{ description: '', quantity: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 }],
		issueDate: today(),
		deliveryDate: today(),
		dueDate: '',
		documentTitle: 'Rechnung',
		notes: '',
		draftId: null,
		error: '',
	};

	function collect(): void {
		root.querySelectorAll<HTMLInputElement>('input[data-p]').forEach(el => {
			const target = el.dataset.p === 'seller' ? s.seller : s.buyer;
			(target as unknown as Record<string, string>)[el.dataset.f!] = el.value;
		});
		root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[data-l],select[data-l]').forEach(el => {
			const [idx, field] = el.dataset.l!.split('.');
			const line = s.lines[Number(idx)];
			if (field === 'quantity' || field === 'unitPriceNet' || field === 'vatRate') {
				(line as unknown as Record<string, number>)[field] = Number(el.value);
			} else {
				(line as unknown as Record<string, string>)[field] = el.value;
			}
		});
		const get = (id: string): string => root.querySelector<HTMLInputElement>(`#${id}`)?.value ?? '';
		s.issueDate = get('w-issue') || s.issueDate;
		s.deliveryDate = get('w-delivery') || s.deliveryDate;
		s.dueDate = get('w-due');
		s.documentTitle = get('w-title') || 'Rechnung';
		s.notes = root.querySelector<HTMLTextAreaElement>('#w-notes')?.value ?? '';
	}

	function stepsBar(): string {
		const names = ['Verkäufer', 'Käufer', 'Positionen', 'Prüfen'];
		return `<div class="steps">${names.map((n, i) => `<span class="${i === s.step ? 'on' : ''}">${i + 1}. ${n}</span>`).join('')}</div>`;
	}

	function render(): void {
		collect();
		let body = '';
		if (s.step === 0) body = `<div class="card"><h3>Verkäufer</h3>${partyFields('seller', s.seller, true)}</div>`;
		if (s.step === 1) body = `<div class="card"><h3>Käufer</h3>${partyFields('buyer', s.buyer, false)}</div>`;
		if (s.step === 2) {
			body = `<div class="card"><h3>Positionen</h3>
				<table class="lines"><tr><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>Preis netto</th><th>USt %</th><th></th></tr>
				${s.lines
					.map(
						(l, i) => `<tr>
					<td><input data-l="${i}.description" value="${esc(l.description)}" /></td>
					<td><input data-l="${i}.quantity" type="number" min="0" step="any" value="${l.quantity}" style="width:70px" /></td>
					<td><input data-l="${i}.unit" value="${esc(l.unit)}" style="width:60px" /></td>
					<td><input data-l="${i}.unitPriceNet" type="number" min="0" step="0.01" value="${l.unitPriceNet}" style="width:90px" /></td>
					<td><select data-l="${i}.vatRate">
						${[19, 7, 0].map(r => `<option ${r === l.vatRate ? 'selected' : ''}>${r}</option>`).join('')}
					</select></td>
					<td><button class="secondary" data-del="${i}">✕</button></td>
				</tr>`,
					)
					.join('')}</table>
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${esc(s.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${esc(s.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${esc(s.dueDate)}" /></label>
				<label>Notizen<textarea id="w-notes">${esc(s.notes)}</textarea></label>
			</div>`;
		}
		if (s.step === 3) {
			const net = s.lines.reduce((a, l) => a + l.quantity * l.unitPriceNet, 0);
			const tax = s.lines.reduce((a, l) => a + (l.quantity * l.unitPriceNet * l.vatRate) / 100, 0);
			body = `<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p>${esc(s.seller.name || '—')} → ${esc(s.buyer.name || '—')} · ${s.lines.length} Positionen</p>
				<p><strong>ca. ${eur(Math.round((net + tax) * 100) / 100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<div id="w-result"></div>
			</div>`;
		}
		root.innerHTML = `${stepsBar()}${body}
			${s.error ? `<div class="card error">${esc(s.error)}</div>` : ''}
			<div class="row">
				${s.step > 0 ? `<button class="secondary" id="w-back">Zurück</button>` : ''}
				${s.step < 3 ? `<button id="w-next">Weiter</button>` : `<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>`}
			</div>`;

		root.querySelector('#w-back')?.addEventListener('click', () => {
			s.step--;
			render();
		});
		root.querySelector('#w-next')?.addEventListener('click', () => {
			s.step++;
			render();
		});
		root.querySelector('#w-add')?.addEventListener('click', () => {
			collect();
			s.lines.push({ description: '', quantity: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 });
			render();
		});
		root.querySelectorAll('[data-del]').forEach(btn =>
			btn.addEventListener('click', () => {
				collect();
				s.lines.splice(Number((btn as HTMLElement).dataset.del), 1);
				if (s.lines.length === 0) s.lines.push({ description: '', quantity: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 });
				render();
			}),
		);
		root.querySelector('#w-save')?.addEventListener('click', () => void save(false));
		root.querySelector('#w-issue')?.addEventListener('click', () => void save(true));
	}

	async function save(issue: boolean): Promise<void> {
		collect();
		s.error = '';
		const input: DraftInput = {
			seller: s.seller,
			buyer: s.buyer,
			lines: s.lines,
			issueDate: s.issueDate,
			deliveryDate: s.deliveryDate,
			dueDate: s.dueDate || undefined,
			currency: 'EUR',
			documentTitle: s.documentTitle,
			notes: s.notes || undefined,
		};
		try {
			let inv: Invoice;
			if (s.draftId) {
				inv = await api.update(s.draftId, input);
			} else {
				inv = await api.create(input);
				s.draftId = inv.id;
			}
			if (issue) {
				inv = await api.issue(inv.id);
			}
			location.hash = `#/invoices/${inv.id}`;
		} catch (e) {
			s.error = (e as Error).message;
			render();
		}
	}

	render();
}
