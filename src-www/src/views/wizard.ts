import { api, esc, eur, type CompanyProfile, type DraftInput, type Invoice, type InvoiceLine, type Party, type Product } from '../api';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });
const emptyLine = (): InvoiceLine => ({ description: '', quantity: 1, unit: 'Stk', unitPriceNet: 0, vatRate: 19 });

/** Rounds to cents without the float trap of a bare Math.round (544 × 19 % = 103,36 → 103). */
function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

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
	selectedCompany: string | null;
	selectedCustomer: string | null;
	/** True once the user changed something (prefill alone does not count). */
	dirty: boolean;
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
		selectedCompany: null,
		selectedCustomer: null,
		dirty: false,
		error: '',
		savedAt: new Date().toISOString(),
	};
}

function hasContent(s: WizardState): boolean {
	return (
		s.dirty &&
		(s.seller.name.trim() !== '' ||
			s.buyer.name.trim() !== '' ||
			s.lines.some(l => l.description.trim() !== '' || l.unitPriceNet !== 0))
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
export function wizard(root: HTMLElement, editId?: string): void {
	let s = freshState();
	const isEdit = !!editId;
	let companies: CompanyProfile[] = [];
	let customers: CompanyProfile[] = [];
	let catalog: Product[] = [];
	/** Guards save/issue against double clicks creating two invoices. */
	let busy = false;
	if (editId) {
		root.innerHTML = `<div class="card">Lade Entwurf…</div>`;
		void api
			.get(editId)
			.then(inv => {
				if (inv.status !== 'draft') {
					root.innerHTML = `<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${esc(inv.status)}).</div>`;
					return;
				}
				s = {
					...freshState(),
					seller: inv.seller,
					buyer: inv.buyer,
					lines: inv.lines.length > 0 ? inv.lines : [emptyLine()],
					issueDate: inv.issueDate,
					deliveryDate: inv.deliveryDate,
					dueDate: inv.dueDate ?? '',
					employee: inv.employeeCode ?? loadEmployee(),
					documentTitle: inv.documentTitle,
					notes: inv.notes ?? '',
					draftId: inv.id,
				};
				bootLists();
				render();
			})
			.catch(e => {
				root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
			});
		return;
	}
	const saved = loadSaved();
	if (saved && hasContent(saved) && !saved.draftId) {
		root.innerHTML = `<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${esc(saved.savedAt.slice(0, 16).replace('T', ' '))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`;
		root.querySelector('#w-resume')?.addEventListener('click', () => {
			s = saved;
			bootLists();
			render();
		});
		root.querySelector('#w-discard')?.addEventListener('click', () => {
			localStorage.removeItem(STORAGE_KEY);
			bootLists();
			render();
		});
		return;
	}
	if (saved && hasContent(saved)) {
		s = saved;
	}
	bootLists();
	if (!hasContent(s)) {
		// fresh wizard: prefill seller from the company profile (set once on Firma page)
		void api.company
			.getDefault()
			.then(profile => {
				if (profile && !s.seller.name.trim() && profile.profile.name.trim()) {
					s.seller = { ...s.seller, ...profile.profile };
					s.selectedCompany = profile.id;
					render(true);
				}
			})
			.catch(() => undefined);
	}

	/** Loads company/customer lists for the dropdowns (re-renders step if needed). */
	function bootLists(): void {
		void api.company
			.list()
			.then(list => {
				companies = list;
				if ((s.step === 0 || s.step === 1) && !root.querySelector('#w-company') && !root.querySelector('#w-customer')) render();
			})
			.catch(() => undefined);
		void api.customers
			.list()
			.then(list => {
				customers = list;
				if (s.step === 1 && !root.querySelector('#w-customer')) render();
			})
			.catch(() => undefined);
		void api.products
			.list()
			.then(list => {
				catalog = list;
				if (s.step === 2 && !root.querySelector('#w-catalog')) render();
			})
			.catch(() => undefined);
	}

	function persist(): void {
		try {
			// An edit session must never touch the "new" resume slot: its state
			// is not dirty by design and would delete a pending new draft.
			if (isEdit) {
				return;
			}
			if (!s.dirty) {
				localStorage.removeItem(STORAGE_KEY);
				return;
			}
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
			if (field === 'quantity' || field === 'unitPriceNet' || field === 'vatRate' || field === 'discountPercent') {
				// NaN/empty must not reach the API, and the discount is clamped here
				// so the preview and the stored value are the same number
				const numeric = Number(el.value);
				const value = Number.isFinite(numeric) ? numeric : 0;
				(line as unknown as Record<string, number>)[field] =
					field === 'discountPercent' ? Math.min(Math.max(value, 0), 100) : value;
			} else {
				(line as unknown as Record<string, string>)[field] = el.value;
			}
		});
		const get = (id: string): string => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ?? '';
		s.issueDate = get('w-issue') || s.issueDate;
		s.deliveryDate = get('w-delivery') || s.deliveryDate;
		if (root.querySelector('#w-due')) s.dueDate = get('w-due');
		if (root.querySelector('#w-employee')) s.employee = get('w-employee');
		if (root.querySelector('#w-title')) s.documentTitle = get('w-title') || s.documentTitle;
		const notesEl = root.querySelector<HTMLTextAreaElement>('#w-notes');
		if (notesEl) s.notes = notesEl.value;
		persist();
	}

	function stepsBar(): string {
		const names = ['Verkäufer', 'Käufer', 'Positionen', 'Prüfen'];
		return `<div class="steps">${names.map((n, i) => `<span class="${i === s.step ? 'on' : ''}">${i + 1}. ${n}</span>`).join('')}</div>`;
	}

	function render(preserve = false): void {
		if (!preserve) collect();
		let body = '';
		if (s.step === 0) {
			body = `<div class="card"><h3>Verkäufer</h3>
				${
					companies.length > 0
						? `<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${companies.map(c => `<option value="${esc(c.id)}" ${s.selectedCompany === c.id ? 'selected' : ''}>${esc(c.name)}${c.isDefault ? ' (Standard)' : ''}</option>`).join('')}
						</select></label>`
						: `<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>`
				}
				${partyFields('seller', s.seller, true)}</div>`;
		}
		if (s.step === 1) {
			body = `<div class="card"><h3>Käufer</h3>
				${
					customers.length > 0
						? `<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${customers.map(c => `<option value="${esc(c.id)}" ${s.selectedCustomer === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
						</select></label>`
						: `<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>`
				}
				${partyFields('buyer', s.buyer, false)}</div>`;
		}
		if (s.step === 2) {
			body = `<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${DOC_TITLES.map(t => `<option ${t === s.documentTitle ? 'selected' : ''}>${t}</option>`).join('')}
				</select></label>
				${
					catalog.length > 0
						? `<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${catalog.map(p => `<option value="${esc(p.id)}">${esc(p.sku ? `${p.sku} · ` : '')}${esc(p.name)}</option>`).join('')}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`
						: ''
				}
				${s.lines
					.map(
						(l, i) => `<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${i}.description" value="${esc(l.description)}" /></label>
						<label>Art.Nr.<input data-l="${i}.sku" value="${esc(l.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${i}.details" rows="1">${esc(l.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${i}.quantity" type="number" min="0" step="any" value="${esc(l.quantity)}" /></label>
						<label>Einheit<input data-l="${i}.unit" value="${esc(l.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${i}.unitPriceNet" type="number" min="0" step="0.01" value="${esc(l.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${i}.discountPercent" type="number" min="0" max="100" step="0.1" value="${esc(l.discountPercent ?? 0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${i}.vatRate">
							${[19, 7, 0].map(r => `<option ${r === Number(l.vatRate) ? 'selected' : ''}>${r}</option>`).join('')}
						</select></label>
						${Number(l.vatRate) === 0 ? `<label>Steuerbefreiung<textarea data-l="${i}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${esc(l.exemptionReason)}</textarea></label>` : ''}
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
			// Mirrors calcTotals() on the server: one rounding per line, from
			// quantity × price × discount, tax derived from the rate basis.
			const lines = s.lines
				.map(l => {
					const quantity = Number(l.quantity) || 0;
					const price = Number(l.unitPriceNet) || 0;
					const discount = Math.min(Math.max(Number(l.discountPercent) || 0, 0), 100);
					const gross = round2(quantity * price);
					return { ...l, discount, gross, net: round2(quantity * price * (1 - discount / 100)) };
				})
				.filter(l => l.description.trim() !== '' || l.gross > 0);
			const byRate = new Map<number, number>();
			for (const l of lines) byRate.set(Number(l.vatRate) || 0, round2((byRate.get(Number(l.vatRate) || 0) ?? 0) + l.net));
			const breakdown = [...byRate.entries()]
				.sort(([a], [b]) => a - b)
				.map(([rate, net]) => ({ rate, net, tax: round2((net * rate) / 100) }));
			const netTotal = round2(breakdown.reduce((a, b) => a + b.net, 0));
			const taxTotal = round2(breakdown.reduce((a, b) => a + b.tax, 0));
			const grossTotal = round2(netTotal + taxTotal);
			const hasDiscount = lines.some(l => l.discount > 0);
			body = `<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${esc(s.documentTitle)}</strong> · ${esc(s.seller.name || '—')} → ${esc(s.buyer.name || '—')} · ${lines.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${hasDiscount ? '<th class="r">Rabatt</th><th class="r">Rabatt €</th>' : ''}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${lines
						.map(
							l => `<tr>
							<td>${esc(l.description) || '<span class="muted">–</span>'}</td>
							<td class="r">${esc(l.quantity)} ${esc(l.unit)}</td>
							<td class="r">${eur(l.unitPriceNet)}</td>
							${hasDiscount ? `<td class="r">${l.discount > 0 ? `${esc(l.discount)} %` : '–'}</td><td class="r">${l.discount > 0 ? eur(round2(l.gross - l.net)) : '–'}</td>` : ''}
							<td class="r">${esc(l.vatRate)} %</td><td class="r"><strong>${eur(l.net)}</strong></td>
						</tr>`,
						)
						.join('')}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${eur(netTotal)}</td></tr>
						${breakdown.map(b => `<tr class="sub"><td class="lbl">USt ${esc(b.rate)} % auf ${eur(b.net)}</td><td class="r">${eur(b.tax)}</td></tr>`).join('')}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${eur(grossTotal)}</td></tr>
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
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
				s.seller = { ...s.seller, ...found.profile };
				s.selectedCompany = found.id;
				render(true);
			} else {
				s.selectedCompany = null;
			}
		});
		root.querySelector('#w-customer')?.addEventListener('change', () => {
			const id = root.querySelector<HTMLSelectElement>('#w-customer')?.value ?? '';
			const found = customers.find(c => c.id === id);
			if (found) {
				s.buyer = { ...s.buyer, ...found.profile };
				s.selectedCustomer = found.id;
				render(true);
			} else {
				s.selectedCustomer = null;
			}
		});
		root.querySelector('#w-next')?.addEventListener('click', () => {
			s.step++;
			render();
		});
		root.querySelector('#w-clear')?.addEventListener('click', () => {
			if (!window.confirm('Eingaben verwerfen und zur Übersicht?')) return;
			localStorage.removeItem(STORAGE_KEY);
			location.hash = '#/';
		});
		root.querySelector('#w-add')?.addEventListener('click', () => {
			collect();
			s.dirty = true;
			s.lines.push(emptyLine());
			render();
		});
		root.querySelector('#w-take')?.addEventListener('click', () => {
			collect();
			const id = root.querySelector<HTMLSelectElement>('#w-catalog')?.value ?? '';
			const found = catalog.find(p => p.id === id);
			if (found) {
				const taken: InvoiceLine = {
					description: found.name,
					sku: found.sku || undefined,
					details: found.details || undefined,
					quantity: 1,
					unit: found.unit,
					unitPriceNet: found.unitPriceNet,
					vatRate: found.vatRate,
				};
				const pristine = s.lines.findIndex(
					l => !l.description.trim() && !(l.sku ?? '').trim() && !(l.details ?? '').trim() && l.unitPriceNet === 0,
				);
				if (pristine >= 0) {
					s.lines[pristine] = taken;
				} else {
					s.lines.push(taken);
				}
				s.dirty = true;
			}
			render(true);
		});
		root.querySelectorAll('[data-del]').forEach(btn =>
			btn.addEventListener('click', () => {
				collect();
				s.dirty = true;
				s.lines.splice(Number((btn as HTMLElement).dataset.del), 1);
				if (s.lines.length === 0) s.lines.push(emptyLine());
				render(true);
			}),
		);
		root.querySelector('#w-save')?.addEventListener('click', () => void save(false));
		root.querySelector('#w-issue')?.addEventListener('click', () => {
			if (!window.confirm('Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).')) return;
			void save(true);
		});
	}

	async function save(issue: boolean): Promise<void> {
		// Without this a double click fires two POSTs before s.draftId is set
		// and creates two invoices.
		if (busy) {
			return;
		}
		busy = true;
		try {
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
				}
				if (issue) {
					inv = await api.issue(inv.id);
				}
				try {
					localStorage.removeItem(STORAGE_KEY);
				} catch {
					// ignore
				}
				location.hash = `#/invoices/${inv.id}`;
			} catch (e) {
				s.error = (e as Error).message;
				render();
			}
		} finally {
			busy = false;
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
		s.dirty = true;
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
			if (field === 'quantity' || field === 'unitPriceNet' || field === 'vatRate' || field === 'discountPercent') {
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
		if (root.querySelector('#w-due')) s.dueDate = get('w-due');
		if (root.querySelector('#w-employee')) s.employee = get('w-employee');
		const title = get('w-title');
		if (title) s.documentTitle = title;
		s.notes = root.querySelector<HTMLTextAreaElement>('#w-notes')?.value ?? s.notes;
		persist();
	}

	render();
}
