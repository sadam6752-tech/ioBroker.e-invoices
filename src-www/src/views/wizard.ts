import { api, esc, eur, type CompanyProfile, type DraftInput, type Invoice, type InvoiceLine, type Party } from '../api';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });
const emptyLine = (): InvoiceLine => ({ description: '', quantity: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 });

/** localStorage key for the unsent wizard state (survives reloads/back). */
const STORAGE_KEY = 'einv-wizard-v1';

/** localStorage key for the last used employee code. */
const EMP_KEY = 'einv-employee';

function loadEmployee(): string {
	try {
		return localStorage.getItem(EMP_KEY) ?? '';
	} catch {
		return '';
	}
}

interface WizardState {
	step: number;
	seller: Party;
	buyer: Party;
	lines: InvoiceLine[];
	issueDate: string;
	deliveryDate: string;
	dueDate: string;
	employee: string;
	documentTitle: string;
	notes: string;
	draftId: string | null;
	error: string;
	savedAt: string;
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function freshState(): WizardState {
	return {
		step: 0,
		seller: emptyParty(),
		buyer: emptyParty(),
		lines: [emptyLine()],
		issueDate: today(),
		deliveryDate: today(),
		dueDate: '',
		employee: loadEmployee(),
		documentTitle: 'Rechnung',
		notes: '',
		draftId: null,
		error: '',
		savedAt: new Date().toISOString(),
	};
}

function hasContent(s: WizardState): boolean {
	return (
		s.seller.name.trim() !== '' ||
		s.buyer.name.trim() !== '' ||
		s.lines.some(l => l.description.trim() !== '' || l.unitPriceNet !== 0)
	);
}

function loadSaved(): WizardState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<WizardState>;
		if (!parsed || !Array.isArray(parsed.lines) || !parsed.seller || !parsed.buyer) return null;
		return { ...freshState(), ...parsed, error: '', step: Math.min(Number(parsed.step) || 0, 3) };
	} catch {
		return null;
	}
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
		<div class="grid2">
			<label>Telefon<input data-p="${prefix}" data-f="phone" value="${esc(p.phone)}" /></label>
			${
				withTax
					? `<label>Webseite<input data-p="${prefix}" data-f="website" value="${esc(p.website)}" /></label>`
					: `<label>Ansprechpartner<input data-p="${prefix}" data-f="contactName" value="${esc(p.contactName)}" /></label>`
			}
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

const DOC_TITLES = ['Rechnung', 'Abschlagsrechnung', 'Schlussrechnung', 'Gutschrift'];

/** Multi-step invoice wizard: seller -> buyer -> lines -> review/issue. */
export function wizard(root: HTMLElement): void {
	let s = freshState();
	const saved = loadSaved();
	if (saved && hasContent(saved) && !saved.draftId) {
		root.innerHTML = `<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${esc(saved.savedAt.slice(0, 16).replace('T', ' '))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`;
		root.querySelector('#w-resume')?.addEventListener('click', () => {
			s = saved;
			render();
		});
		root.querySelector('#w-discard')?.addEventListener('click', () => {
			localStorage.removeItem(STORAGE_KEY);
			render();
		});
		return;
	}
	if (saved && hasContent(saved)) {
		s = saved;
	}
	let companies: CompanyProfile[] = [];
	void api.company
		.list()
		.then(list => {
			companies = list;
			if (s.step === 0 && !root.querySelector('#w-company')) render();
		})
		.catch(() => undefined);
	if (!hasContent(s)) {
		// fresh wizard: prefill seller from the company profile (set once on Firma page)
		void api.company
			.getDefault()
			.then(profile => {
				if (profile && !s.seller.name.trim() && profile.profile.name.trim()) {
					s.seller = { ...s.seller, ...profile.profile };
					render();
				}
			})
			.catch(() => undefined);
	}

	function persist(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, error: '', savedAt: new Date().toISOString() }));
		} catch {
			// storage full/blocked — wizard still works, just without resume
		}
	}

	function collect(): void {
		root.querySelectorAll<HTMLInputElement>('input[data-p]').forEach(el => {
			const target = el.dataset.p === 'seller' ? s.seller : s.buyer;
			(target as unknown as Record<string, string>)[el.dataset.f!] = el.value;
		});
		root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[data-l],select[data-l],textarea[data-l]').forEach(el => {
			const [idx, field] = el.dataset.l!.split('.');
			const line = s.lines[Number(idx)];
			if (!line) return;
			if (field === 'quantity' || field === 'unitPriceNet' || field === 'vatRate') {
				(line as unknown as Record<string, number>)[field] = Number(el.value);
			} else {
				(line as unknown as Record<string, string>)[field] = el.value;
			}
		});
		const get = (id: string): string => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? '';
		s.issueDate = get('w-issue') || s.issueDate;
		s.deliveryDate = get('w-delivery') || s.deliveryDate;
		s.dueDate = get('w-due');
		if (root.querySelector('#w-employee')) s.employee = get('w-employee');
		s.documentTitle = get('w-title') || 'Rechnung';
		s.notes = root.querySelector<HTMLTextAreaElement>('#w-notes')?.value ?? '';
		persist();
	}

	function stepsBar(): string {
		const names = ['Verkäufer', 'Käufer', 'Positionen', 'Prüfen'];
		return `<div class="steps">${names.map((n, i) => `<span class="${i === s.step ? 'on' : ''}">${i + 1}. ${n}</span>`).join('')}</div>`;
	}

	function render(): void {
		collect();
		let body = '';
		if (s.step === 0) {
			body = `<div class="card"><h3>Verkäufer</h3>
				${
					companies.length > 0
						? `<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${companies.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.isDefault ? ' (Standard)' : ''}</option>`).join('')}
						</select></label>`
						: `<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>`
				}
				${partyFields('seller', s.seller, true)}</div>`;
		}
		if (s.step === 1) body = `<div class="card"><h3>Käufer</h3>${partyFields('buyer', s.buyer, false)}</div>`;
		if (s.step === 2) {
			body = `<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${DOC_TITLES.map(t => `<option ${t === s.documentTitle ? 'selected' : ''}>${t}</option>`).join('')}
				</select></label>
				${s.lines
					.map(
						(l, i) => `<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${i}.description" value="${esc(l.description)}" /></label>
						<label>Art.Nr.<input data-l="${i}.sku" value="${esc(l.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${i}.details" rows="1">${esc(l.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${i}.quantity" type="number" min="0" step="any" value="${l.quantity}" /></label>
						<label>Einheit<input data-l="${i}.unit" value="${esc(l.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${i}.unitPriceNet" type="number" min="0" step="0.01" value="${l.unitPriceNet}" /></label>
						<label>USt %<select data-l="${i}.vatRate">
							${[19, 7, 0].map(r => `<option ${r === l.vatRate ? 'selected' : ''}>${r}</option>`).join('')}
						</select></label>
					</div>
					<button class="secondary" data-del="${i}">Position entfernen</button>
				</div>`,
					)
					.join('')}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${esc(s.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${esc(s.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${esc(s.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${esc(s.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${esc(s.notes)}</textarea></label>
			</div>`;
		}
		if (s.step === 3) {
			const net = s.lines.reduce((a, l) => a + l.quantity * l.unitPriceNet, 0);
			const tax = s.lines.reduce((a, l) => a + (l.quantity * l.unitPriceNet * l.vatRate) / 100, 0);
			body = `<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${esc(s.documentTitle)}</strong> · ${esc(s.seller.name || '—')} → ${esc(s.buyer.name || '—')} · ${s.lines.length} Positionen</p>
				<p><strong>ca. ${eur(Math.round((net + tax) * 100) / 100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`;
		}
		root.innerHTML = `${stepsBar()}${body}
			${s.error ? `<div class="card error">${esc(s.error)}</div>` : ''}
			<div class="row">
				${s.step > 0 ? `<button class="secondary" id="w-back">Zurück</button>` : ''}
				${s.step < 3 ? `<button id="w-next">Weiter</button>` : `<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>`}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`;

		root.querySelector('#w-back')?.addEventListener('click', () => {
			s.step--;
			render();
		});
		root.querySelector('#w-company')?.addEventListener('change', () => {
			const id = root.querySelector<HTMLSelectElement>('#w-company')?.value ?? '';
			const found = companies.find(c => c.id === id);
			if (found) {
				collect();
				s.seller = { ...s.seller, ...found.profile };
				render();
			}
		});
		root.querySelector('#w-next')?.addEventListener('click', () => {
			s.step++;
			render();
		});
		root.querySelector('#w-clear')?.addEventListener('click', () => {
			if (!window.confirm('Eingaben verwerfen?')) return;
			localStorage.removeItem(STORAGE_KEY);
			s = freshState();
			render();
		});
		root.querySelector('#w-add')?.addEventListener('click', () => {
			collect();
			s.lines.push(emptyLine());
			render();
		});
		root.querySelectorAll('[data-del]').forEach(btn =>
			btn.addEventListener('click', () => {
				collect();
				s.lines.splice(Number((btn as HTMLElement).dataset.del), 1);
				if (s.lines.length === 0) s.lines.push(emptyLine());
				render();
			}),
		);
		root.querySelector('#w-save')?.addEventListener('click', () => void save(false));
		root.querySelector('#w-issue')?.addEventListener('click', () => {
			if (!window.confirm('Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).')) return;
			void save(true);
		});
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
			employeeCode: s.employee.trim() || undefined,
			documentTitle: s.documentTitle,
			notes: s.notes || undefined,
		};
		try {
			if (s.employee.trim()) {
				try {
					localStorage.setItem(EMP_KEY, s.employee.trim());
				} catch {
					// ignore
				}
			}
			let inv: Invoice;
			if (s.draftId) {
				inv = await api.update(s.draftId, input);
			} else {
				inv = await api.create(input);
				s.draftId = inv.id;
				persist();
			}
			if (issue) {
				inv = await api.issue(inv.id);
				localStorage.removeItem(STORAGE_KEY);
			}
			location.hash = `#/invoices/${inv.id}`;
		} catch (e) {
			s.error = (e as Error).message;
			render();
		}
	}

	// Persist every keystroke without re-rendering (survives reload/back).
	root.addEventListener('input', () => {
		try {
			collectSilent();
		} catch {
			// ignore
		}
	});

	function collectSilent(): void {
		root.querySelectorAll<HTMLInputElement>('input[data-p]').forEach(el => {
			const target = el.dataset.p === 'seller' ? s.seller : s.buyer;
			(target as unknown as Record<string, string>)[el.dataset.f!] = el.value;
		});
		root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
			'input[data-l],select[data-l],textarea[data-l]',
		).forEach(el => {
			const [idx, field] = (el as HTMLElement).dataset.l!.split('.');
			const line = s.lines[Number(idx)];
			if (!line) return;
			if (field === 'quantity' || field === 'unitPriceNet' || field === 'vatRate') {
				(line as unknown as Record<string, number>)[field] = Number((el as HTMLInputElement).value);
			} else {
				(line as unknown as Record<string, string>)[field] = (el as HTMLInputElement).value;
			}
		});
		const get = (id: string): string =>
			root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? '';
		const issue = get('w-issue');
		const delivery = get('w-delivery');
		if (issue) s.issueDate = issue;
		if (delivery) s.deliveryDate = delivery;
		s.dueDate = get('w-due');
		if (root.querySelector('#w-employee')) s.employee = get('w-employee');
		const title = get('w-title');
		if (title) s.documentTitle = title;
		s.notes = root.querySelector<HTMLTextAreaElement>('#w-notes')?.value ?? s.notes;
		persist();
	}

	render();
}
