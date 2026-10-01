import { api, esc, eur, type CompanyProfile, type DraftInput, type Invoice, type InvoiceLine, type InvoiceTemplate, type Party, type Product } from '../api';
import { defaultTitle, isQuote, labels, normalizeDocType, QUOTE_VALIDITY_DAYS, type DocType } from '../labels';
import { mountAttachments } from './attachments';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });
const emptyLine = (): InvoiceLine => ({
	description: '',
	quantity: 1,
	unit: 'Stk',
	unitPriceNet: 0,
	vatRate: settings.defaultVatRate,
});

/** Invoicing defaults from the instance config (see admin/jsonConfig.json). */
let settings = { defaultVatRate: 19, defaultPaymentTerms: '' };

/**
 * Payment terms offered in the wizard. `days` is the offset from the issue
 * date, so picking a text also maintains the due date.
 */
const PAYMENT_TERMS_PRESETS = [
	{ text: 'Der Rechnungsbetrag ist sofort ohne Abzug fällig.', days: 0 },
	{ text: 'Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.', days: 14 },
	{ text: 'Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.', days: 30 },
] as const;

/** Marker for "the user typed their own text". */
const OWN_TERMS = '__own__';

/** Adds days to an ISO date, returning the input unchanged when it is invalid. */
function addDays(iso: string, days: number): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
		return iso;
	}
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** True when the text is not one of the presets (so the own field shows). */
function isCustomTerms(value?: string | null): boolean {
	return !!value && !isPreset(value);
}

/** True when the text is one of the three presets. */
function isPreset(value?: string | null): boolean {
	return !!value && PAYMENT_TERMS_PRESETS.some(p => p.text === value);
}

/** The day offset of a preset text, or null for free text. */
function presetDays(value?: string | null): number | null {
	return PAYMENT_TERMS_PRESETS.find(p => p.text === value)?.days ?? null;
}

/**
 * Keeps a due date that was derived from a payment-terms preset in step with
 * the issue date. A manually entered date is never touched.
 *
 * @param state - Wizard state, mutated in place.
 */
function syncAutoDueDate(state: WizardState): void {
	if (!state.dueAuto) {
		return;
	}
	const days = presetDays(state.paymentTerms);
	if (days === null) {
		return;
	}
	state.dueDate = addDays(state.issueDate, days);
}

/**
 * R8: keeps the prefilled validity of an offer in step with the issue date.
 * A date the user typed themselves is never touched — only the untouched
 * default (issue date + 30 days) moves along.
 *
 * @param state - Wizard state, mutated in place.
 * @param previousIssueDate - Issue date before the current edit.
 */
function syncValidUntil(state: WizardState, previousIssueDate: string): void {
	if (!isQuote(state.docType)) {
		return;
	}
	if (!state.validUntil || state.validUntil === addDays(previousIssueDate, QUOTE_VALIDITY_DAYS)) {
		state.validUntil = addDays(state.issueDate, QUOTE_VALIDITY_DAYS);
	}
}

/** Rounds to cents without the float trap of a bare Math.round (544 × 19 % = 103,36 → 103). */
function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Line net exactly as the server computes it (one rounding, quantity × price × discount). */
function lineNet(line: InvoiceLine): number {
	const quantity = Number(line.quantity) || 0;
	const price = Number(line.unitPriceNet) || 0;
	const discount = Math.min(Math.max(Number(line.discountPercent) || 0, 0), 100);
	return round2(quantity * price * (1 - discount / 100));
}

/** Start day of a stored delivery value (`YYYY-MM-DD` or `from..to`). */
function deliveryStart(value: string): string {
	return (value ?? '').trim().split('..')[0] ?? '';
}

/** End day of a stored delivery value, empty for a single day. */
function deliveryEnd(value: string): string {
	const parts = (value ?? '').trim().split('..');
	return parts.length > 1 ? parts[1] : '';
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
	/** R8: what is being typed — decides number circle, labels and artifacts. */
	docType: DocType;
	seller: Party;
	buyer: Party;
	lines: InvoiceLine[];
	issueDate: string;
	deliveryDate: string;
	dueDate: string;
	/** R8: last day an offer stands (ISO), empty for an invoice. */
	validUntil: string;
	employee: string;
	documentTitle: string;
	notes: string;
	/** Cash discount in percent, 0 = none. */
	skontoPercent: number;
	/** Last day for the cash discount. */
	skontoDueDate: string;
	/** Payment terms text (default from the instance config). */
	paymentTerms: string;
	/** True when the payment terms are free text instead of a preset. */
	termsCustom: boolean;
	/** True while the due date is derived from the selected payment terms. */
	dueAuto: boolean;
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
		docType: 'invoice',
		seller: emptyParty(),
		buyer: emptyParty(),
		lines: [emptyLine()],
		issueDate: today(),
		deliveryDate: today(),
		dueDate: '',
		validUntil: '',
		employee: loadEmployee(),
		documentTitle: defaultTitle('invoice'),
		notes: '',
		paymentTerms: settings.defaultPaymentTerms,
		termsCustom: isCustomTerms(settings.defaultPaymentTerms),
		dueAuto: false,
		skontoPercent: 0,
		skontoDueDate: '',
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
				: `<label class="req">Kundennummer (BT-10) *<input data-p="${prefix}" data-f="customerNumber" value="${esc(p.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`
		}`;
}

/** German labels for the EN 16931 VAT category codes used on 0 % lines. */
const EXEMPTION_LABELS: Record<string, string> = {
	E: 'steuerfrei',
	AE: 'Reverse Charge (§13b UStG)',
	K: 'Kraftfahrzeug (§4 Nr. 1b UStG)',
	G: 'Gold (§4 Nr. 1a UStG)',
	O: 'nicht umkehrbar',
};

/** Multi-step invoice wizard: seller -> buyer -> lines -> review/issue. */
export function wizard(root: HTMLElement, editId?: string, docType: DocType = 'invoice'): void {
	let s = freshState();
	// R8: the entry point decides the type of a *new* document — an existing one
	// keeps the type it was created with, its number circle hangs on it.
	if (!editId && docType === 'quote') {
		s.docType = 'quote';
		s.documentTitle = defaultTitle('quote');
		s.validUntil = addDays(s.issueDate, QUOTE_VALIDITY_DAYS);
	}
	const isEdit = !!editId;
	let companies: CompanyProfile[] = [];
	let customers: CompanyProfile[] = [];
	let catalog: Product[] = [];
	/** Reusable invoice content (recurring maintenance, flat fees). */
	let invoiceTemplates: InvoiceTemplate[] = [];
	/** Guards save/issue against double clicks creating two invoices. */
	let busy = false;
	// The list loader is called from every branch below, so the guard must be
	// initialized here: a `let` declared further down would still be in the
	// temporal dead zone and crash the wizard on open (TDZ ReferenceError).
	let listsLoaded = false;
	// invoicing defaults (standard VAT rate, payment terms) from the instance config
	void api
		.settings()
		.then(cfg => {
			settings = { defaultVatRate: Number(cfg.defaultVatRate) || 19, defaultPaymentTerms: cfg.defaultPaymentTerms ?? '' };
		})
		.catch(() => undefined);
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
					docType: normalizeDocType(inv.docType),
					seller: inv.seller,
					buyer: inv.buyer,
					lines: inv.lines.length > 0 ? inv.lines : [emptyLine()],
					issueDate: inv.issueDate,
					deliveryDate: inv.deliveryDate,
					dueDate: inv.dueDate ?? '',
					validUntil: inv.validUntil ?? '',
					employee: inv.employeeCode ?? loadEmployee(),
					documentTitle: inv.documentTitle,
					notes: inv.notes ?? '',
					paymentTerms: inv.paymentTerms ?? settings.defaultPaymentTerms,
					termsCustom: isCustomTerms(inv.paymentTerms),
					skontoPercent: inv.skontoPercent ?? 0,
					skontoDueDate: inv.skontoDueDate ?? '',
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
	// A saved state belongs to the type it was typed for: a new offer must not
	// resume an invoice draft that happens to be in the browser.
	const resumable = saved && hasContent(saved) && (docType !== 'quote' || isQuote(saved.docType)) ? saved : null;
	if (resumable && !resumable.draftId) {
		root.innerHTML = `<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter ${esc(labels(resumable.docType).one)}-Entwurf vom ${esc(
				resumable.savedAt.slice(0, 16).replace('T', ' '),
			)} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`;
		root.querySelector('#w-resume')?.addEventListener('click', () => {
			s = resumable;
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
	if (resumable) {
		s = resumable;
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

	/**
	 * Loads the company, customer, catalog and template lists once per visit.
	 *
	 * Each list renders itself when it arrives, guarded by its own field: the
	 * catalog field is `#w-catalog`, so a re-render must not restart the whole
	 * chain or the select would keep its stale (empty) options.
	 */
	function bootLists(): void {
		if (listsLoaded) {
			return;
		}
		listsLoaded = true;
		const rerender = (field: string, apply: () => void): void => {
			apply();
			if (!root.querySelector(field)) {
				render(true);
			}
		};
		void api.company
			.list()
			.then(list => rerender('#w-company', () => (companies = list)))
			.catch(() => undefined);
		void api.customers
			.list()
			.then(list => rerender('#w-customer', () => (customers = list)))
			.catch(() => undefined);
		void api.products
			.list()
			.then(list => rerender('#w-catalog', () => (catalog = list)))
			.catch(() => undefined);
		void api.invoiceTemplates
			.list()
			.then(list => rerender('#w-inv-tpl', () => (invoiceTemplates = list)))
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
		const readDelivery = (): void => {
			const from = get('w-delivery');
			if (!from) {
				return;
			}
			const to = get('w-delivery-to');
			s.deliveryDate = to && to !== from ? `${from}..${to}` : from;
		};
		const issueBefore = s.issueDate;
		s.issueDate = get('w-issue') || s.issueDate;
		readDelivery();
		if (root.querySelector('#w-due')) s.dueDate = get('w-due');
		syncAutoDueDate(s);
		if (root.querySelector('#w-valid')) s.validUntil = get('w-valid') || s.validUntil;
		syncValidUntil(s, issueBefore);
		if (root.querySelector('#w-employee')) s.employee = get('w-employee');
		if (root.querySelector('#w-title')) s.documentTitle = get('w-title') || s.documentTitle;
		const notesEl = root.querySelector<HTMLTextAreaElement>('#w-notes');
		if (notesEl) s.notes = notesEl.value;
		const termsEl = root.querySelector<HTMLTextAreaElement>('#w-terms');
		if (termsEl) s.paymentTerms = termsEl.value;
		if (root.querySelector('#w-skonto')) {
			const raw = Number(get('w-skonto'));
			s.skontoPercent = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 100) : 0;
		}
		if (root.querySelector('#w-skonto-due')) s.skontoDueDate = get('w-skonto-due');
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
					isEdit
						? `<p class="muted">Belegart: <strong>${esc(
								labels(s.docType).one,
							)}</strong> — bleibt beim Bearbeiten erhalten, der Nummernkreis hängt an ihr.</p>`
						: `<label>Belegart<select id="w-doctype">
							<option value="invoice" ${s.docType === 'invoice' ? 'selected' : ''}>Rechnung — E-Rechnung mit XML, Mahnwesen, Export</option>
							<option value="quote" ${s.docType === 'quote' ? 'selected' : ''}>Angebot — Sicht-PDF ohne XML, eigene Nummer</option>
						</select></label>`
				}
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
							${customers
								.map(
									c =>
										`<option value="${esc(c.id)}" ${s.selectedCustomer === c.id ? 'selected' : ''}>${esc(c.name)}${c.profile.customerNumber?.trim() ? '' : ' (ohne Kundennr.)'}</option>`,
								)
								.join('')}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`
						: `<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>`
				}
				${partyFields('buyer', s.buyer, false)}</div>`;
		}
		if (s.step === 2) {
			body = `<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${labels(s.docType)
						.titles.map(t => `<option ${t === s.documentTitle ? 'selected' : ''}>${t}</option>`)
						.join('')}
				</select></label>
				${
					invoiceTemplates.length > 0
						? `<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${invoiceTemplates.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`
						: `<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>`
				}
				${
					catalog.length > 0
						? `<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${catalog.map(p => `<option value="${esc(p.id)}">${esc(p.sku ? `${p.sku} · ` : '')}${esc(p.name)}</option>`).join('')}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`
						: ''
				}
				${s.lines
					.map(
						(l, i) => `<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${i + 1}</span><strong>Position ${i + 1}</strong>
						<span class="line-sum">${eur(lineNet(l))}</span></div>
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
						${Number(l.vatRate) === 0 ? `<label>Steuerbefreiung<select data-l="${i}.exemptionCategory">
								${(['E', 'AE', 'K', 'G', 'O'] as const)
									.map(c => `<option ${(l.exemptionCategory ?? 'E') === c ? 'selected' : ''} value="${c}">${c} — ${EXEMPTION_LABELS[c]}</option>`)
									.join('')}
							</select></label>
							<label>Begründung<textarea data-l="${i}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${esc(l.exemptionReason)}</textarea></label>` : ''}
					</div>
					<button class="secondary" data-del="${i}">Position entfernen</button>
				</div>`,
					)
					.join('')}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${esc(s.issueDate)}" /></label>
					${
						isQuote(s.docType)
							? `<label>${esc(labels(s.docType).validUntil.replace(/:$/, ''))}<input id="w-valid" type="date" value="${esc(
									s.validUntil,
								)}" />${
									s.validUntil === addDays(s.issueDate, QUOTE_VALIDITY_DAYS)
										? ' <span class="muted">(30 Tage)</span>'
										: ''
								}</label>`
							: `<label>Fällig am<input id="w-due" type="date" value="${esc(s.dueDate)}" />${
									s.dueAuto ? ' <span class="muted">(aus Zahlungsbedingung)</span>' : ''
								}</label>`
					}
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${esc(deliveryStart(s.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${esc(deliveryEnd(s.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. ${
						isQuote(s.docType)
							? 'Mit „bis" steht der Zeitraum als Leistungszeitraum auf dem Angebot.'
							: 'Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.'
					}</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. ${
					isQuote(s.docType) ? 'A-JJJJ-KK-LLL' : 'JJJJ-KK-LLL'
				})<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${esc(s.employee)}" /></label>
				${
					isQuote(s.docType)
						? `<p class="muted">Ein Angebot kennt kein Zahlungsziel, keinen Skonto und keine Zahlungsbedingungen —
							es gilt bis zum Datum „Gültig bis".</p>`
						: `<fieldset class="period">
					<legend>Skonto (Rabatt bei früher Zahlung)</legend>
					<div class="grid2">
						<label>Skonto %<input id="w-skonto" type="number" min="0" max="100" step="0.01" value="${esc(s.skontoPercent)}" /></label>
						<label>Skonto bis<input id="w-skonto-due" type="date" value="${esc(s.skontoDueDate)}" /></label>
					</div>
					<p class="muted">Bei 0 % kein Skonto. Ohne eigenes Datum gilt das Fälligkeitsdatum. Der Skonto mindert den Zahlbetrag (BT-9) und steht als Bedingung mit Subject-Code AAK im XML.</p>
				</fieldset>
				<label>Zahlungsbedingungen<select id="w-terms-select">
					<option value="" ${s.paymentTerms === '' ? 'selected' : ''}>keine</option>
					${PAYMENT_TERMS_PRESETS.map(
						p => `<option value="${esc(p.text)}" ${!s.termsCustom && s.paymentTerms === p.text ? 'selected' : ''}>${esc(p.text)}</option>`,
					).join('')}
					<option value="${OWN_TERMS}" ${s.termsCustom ? 'selected' : ''}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${
					s.termsCustom
						? `<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${esc(s.paymentTerms)}</textarea></label>`
						: ''
				}`
				}
				<label>Notizen<textarea id="w-notes">${esc(s.notes)}</textarea></label>
			</div>`;
		}
		if (s.step === 3) {
			// Mirrors calcTotals() on the server: one rounding per line, from
			// quantity × price × discount, tax derived from the rate basis.
			const lines = s.lines
				.map(l => {
					const discount = Math.min(Math.max(Number(l.discountPercent) || 0, 0), 100);
					return { ...l, discount, gross: round2((Number(l.quantity) || 0) * (Number(l.unitPriceNet) || 0)), net: lineNet(l) };
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
			const skontoAmount = round2((grossTotal * (Number(s.skontoPercent) || 0)) / 100);
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
						${
							!isQuote(s.docType) && s.skontoPercent > 0
								? `<tr class="sub"><td class="lbl">${esc(s.skontoPercent)} % Skonto bis ${esc(s.skontoDueDate || s.dueDate || '—')}</td><td class="r">−${eur(skontoAmount)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${eur(grossTotal - skontoAmount)}</td></tr>`
								: ''
						}
					</tbody>
				</table>
				${
					isQuote(s.docType)
						? `<p class="muted">${esc(labels(s.docType).validUntil)} ${esc(
								s.validUntil || addDays(s.issueDate, QUOTE_VALIDITY_DAYS),
							)} — ein Angebot ist keine E-Rechnung: es gibt kein XML und keine XSD-Prüfung.</p>
					<p class="muted">Ausstellen vergibt endgültig die Angebotsnummer aus dem eigenen Nummernkreis — die Rechnungsnummern bleiben davon unberührt.</p>`
						: `<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
					<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>`
				}
			</div>`;
		}
		root.innerHTML = `${stepsBar()}${body}
			${s.error ? `<div class="card error">${esc(s.error)}</div>` : ''}
			${s.step === 3 ? `<div id="w-attachments"></div>` : ''}
			<div class="row">
				${s.step > 0 ? `<button class="secondary" id="w-back">Zurück</button>` : ''}
				${s.step < 3 ? `<button id="w-next">Weiter</button>` : `<button id="w-save">Entwurf speichern</button><button id="w-issue">${esc(labels(s.docType).issue)}</button>`}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`;

		// R4: Anlagen gehören zum gespeicherten Entwurf. Der Bereich erscheint im
		// letzten Schritt; ohne Entwurf steht dort, was zu tun ist.
		const attachmentHost = root.querySelector<HTMLElement>('#w-attachments');
		if (attachmentHost) {
			if (s.draftId) {
				mountAttachments(attachmentHost, s.draftId, { readOnly: false });
			} else {
				attachmentHost.innerHTML = `<div class="card"><h3 style="margin:0">Anlagen</h3>
					<p class="muted">Belege wie Lieferschein oder Nachweis lassen sich nach dem Speichern des
					Entwurfs anhängen: erst „Entwurf speichern“, dann hier hochladen. Beim Ausstellen wandern die
					Anlagen in PDF und XML.</p></div>`;
			}
		}

		root.querySelector('#w-back')?.addEventListener('click', () => {
			s.step--;
			render();
		});
		// must be bound here and not in collect(): collect() runs *before* the
		// new innerHTML exists, so a listener bound there would be thrown away
		root.querySelector('#w-terms-select')?.addEventListener('change', event => {
			const value = (event.target as HTMLSelectElement).value;
			if (value === OWN_TERMS) {
				s.termsCustom = true;
				// start empty unless the current text already is free text
				if (isPreset(s.paymentTerms)) {
					s.paymentTerms = '';
				}
				// free text: the user states the term themselves, so the date
				// must not jump silently
				s.dueAuto = false;
			} else {
				s.termsCustom = false;
				s.paymentTerms = value;
				const days = presetDays(value);
				if (days !== null) {
					// a preset always carries its payment window
					s.dueAuto = true;
					s.dueDate = addDays(s.issueDate, days);
				} else {
					s.dueAuto = false;
				}
			}
			render();
		});
		// a manually entered date always wins over the derived one
		root.querySelector('#w-due')?.addEventListener('change', () => {
			collect();
			s.dueAuto = false;
			render();
		});
		// R8: the type of a new document is chosen here; it decides the number
		// circle, the wording and the review hints. An existing document keeps
		// its type (the number circle hangs on it), so the field is not rendered.
		root.querySelector('#w-doctype')?.addEventListener('change', event => {
			const next = normalizeDocType((event.target as HTMLSelectElement).value);
			if (next === s.docType) {
				return;
			}
			collect();
			s.docType = next;
			s.dirty = true;
			if (isQuote(next)) {
				// an offer states a validity: no due date, no Skonto and no
				// invoice payment terms travel with it
				s.dueDate = '';
				s.dueAuto = false;
				s.skontoPercent = 0;
				s.skontoDueDate = '';
				s.paymentTerms = '';
				s.termsCustom = false;
				s.validUntil = addDays(s.issueDate, QUOTE_VALIDITY_DAYS);
			} else {
				s.validUntil = '';
				s.paymentTerms = settings.defaultPaymentTerms;
				s.termsCustom = isCustomTerms(settings.defaultPaymentTerms);
				s.dueAuto = false;
			}
			if (!labels(next).titles.includes(s.documentTitle)) {
				s.documentTitle = defaultTitle(next);
			}
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
		root.querySelector('#w-inv-tpl')?.addEventListener('change', event => {
			const id = (event.target as HTMLSelectElement).value;
			const tpl = invoiceTemplates.find(t => t.id === id);
			if (!tpl) {
				return;
			}
			if (s.lines.length > 0 && !window.confirm(`Positionen durch "${tpl.name}" ersetzen?`)) {
				return;
			}
			// Content comes from the template, parties and dates stay the user's.
			const body = tpl.body as Partial<DraftInput>;
			if (Array.isArray(body.lines) && body.lines.length > 0) {
				s.lines = body.lines.map(l => ({ ...emptyLine(), ...l }));
			}
			if (typeof body.paymentTerms === 'string') {
				s.paymentTerms = body.paymentTerms;
			}
			if (typeof body.notes === 'string') {
				s.notes = body.notes;
			}
			if (typeof body.documentTitle === 'string' && body.documentTitle) {
				s.documentTitle = body.documentTitle;
			}
			if (typeof body.skontoPercent === 'number' && body.skontoPercent > 0) {
				s.skontoPercent = body.skontoPercent;
			}
			if (typeof body.dueDate === 'string') {
				s.dueDate = body.dueDate;
			}
			if (typeof body.deliveryDate === 'string') {
				s.deliveryDate = body.deliveryDate;
			}
			render(true);
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
			if (!window.confirm(labels(s.docType).issueConfirm)) return;
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
				// R8: the type travels with every write — it decides the number
				// circle, the validation rules and the artifacts
				docType: s.docType,
			employeeCode: s.employee.trim() || undefined,
			documentTitle: s.documentTitle,
			notes: s.notes || undefined,
			paymentTerms: s.paymentTerms || undefined,
			skontoPercent: s.skontoPercent || undefined,
			skontoDueDate: s.skontoDueDate || undefined,
			// R8: an offer carries a validity; the server fills the 30-day
			// default when the field is left empty
			validUntil: isQuote(s.docType) ? s.validUntil || addDays(s.issueDate, QUOTE_VALIDITY_DAYS) : undefined,
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
		const issueBefore = s.issueDate;
		const issue = get('w-issue');
		const delivery = get('w-delivery');
		const deliveryTo = get('w-delivery-to');
		if (issue) s.issueDate = issue;
		if (delivery) s.deliveryDate = deliveryTo && deliveryTo !== delivery ? `${delivery}..${deliveryTo}` : delivery;
		if (root.querySelector('#w-due')) s.dueDate = get('w-due');
		syncAutoDueDate(s);
		if (root.querySelector('#w-valid')) s.validUntil = get('w-valid') || s.validUntil;
		syncValidUntil(s, issueBefore);
		if (root.querySelector('#w-employee')) s.employee = get('w-employee');
		const title = get('w-title');
		if (title) s.documentTitle = title;
		if (root.querySelector('#w-skonto')) {
			const raw = Number(get('w-skonto'));
			s.skontoPercent = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 100) : 0;
		}
		if (root.querySelector('#w-skonto-due')) s.skontoDueDate = get('w-skonto-due');
		s.notes = root.querySelector<HTMLTextAreaElement>('#w-notes')?.value ?? s.notes;
		s.paymentTerms = root.querySelector<HTMLTextAreaElement>('#w-terms')?.value ?? s.paymentTerms;
		persist();
	}

	render();
}
