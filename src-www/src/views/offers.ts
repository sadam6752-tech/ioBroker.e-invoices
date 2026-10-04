import { api, esc, eur, type Invoice } from '../api';
import { t } from '../i18n';
import { labels, quoteState, quoteStateLabel, type QuoteState } from '../labels';

/**
 * Offers (R8): the second document type, with its own number circle and its own
 * life cycle — open, accepted, rejected, expired.
 *
 * The list mirrors the invoice dashboard, but the rows speak the offer words
 * and carry the decision and the conversion into an invoice draft. The state is
 * derived from the stored dates by `quoteState()` (the same rules the server
 * applies), so a state filter costs no extra endpoint.
 *
 * @param root - Element the page is rendered into.
 */
export async function offers(root: HTMLElement): Promise<void> {
	const lbl = labels('quote');
	root.innerHTML = `
		<div class="card">
			<div class="row"><strong>${esc(lbl.plural)}</strong></div>
			<div class="row filters">
				<select id="o-state" title="${t('Zustand')}">
					<option value="">${t('alle')}</option>
					<option value="draft">${t('Entwurf')}</option>
					<option value="open">${t('Offen')}</option>
					<option value="accepted">${t('Angenommen')}</option>
					<option value="rejected">${t('Abgelehnt')}</option>
					<option value="expired">${t('Verfallen')}</option>
				</select>
				<select id="o-sort" title="${t('Sortierung')}">
					<option value="date">${t('Datum')}</option>
					<option value="number">${t('Nummer')}</option>
					<option value="amount">${t('Betrag')}</option>
					<option value="customer">${t('Kunde')}</option>
				</select>
			</div>
			<div class="row actions">
				<input id="o-q" placeholder="${t('Suche (Nr, Kunde, Position)…')}" />
				<button class="btn secondary" id="o-order" title="${t('Umschalten aufsteigend/absteigend')}">↓ ${t('absteigend')}</button>
				<a class="btn" href="#/new/quote">${esc(lbl.newOne)}</a>
				<button class="btn secondary" id="o-issue-all" title="${t('Alle sichtbaren Entwürfe ausstellen')}" hidden>${t('Ausstellen')} (0)</button>
			</div>
			<p class="muted">${esc(lbl.hint)}</p>
		</div>
		<div id="o-err"></div>
		<div id="o-list"></div>`;

	const stateEl = root.querySelector<HTMLSelectElement>('#o-state')!;
	const qEl = root.querySelector<HTMLInputElement>('#o-q')!;
	const sortEl = root.querySelector<HTMLSelectElement>('#o-sort')!;
	const orderBtn = root.querySelector<HTMLButtonElement>('#o-order')!;
	const listEl = root.querySelector('#o-list')!;
	const errEl = root.querySelector('#o-err')!;
	/** Current sort direction, toggled by the order button. */
	let order: 'asc' | 'desc' = 'desc';
	/** Offers of the last load, so an action knows the state of its row. */
	let shown: Invoice[] = [];
	/** Draft ids currently visible, for the batch issue. */
	let visibleDrafts: string[] = [];
	/** Monotonic request counter to discard stale responses. */
	let loadSeq = 0;

	/**
	 * Surfaces an error above the list without throwing the view away.
	 *
	 * @param e - The caught error.
	 */
	function fail(e: unknown): void {
		errEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}

	/**
	 * One row: number, state, customer, amount, validity and the actions.
	 *
	 * @param o - Option to render.
	 */
	function row(o: Invoice): string {
		const state = quoteState(o);
		return `<div class="card"><div class="row">
			<strong>${esc(o.number ?? t('(Entwurf)'))}</strong>
			<span class="badge ${state}">${quoteStateLabel(state)}</span>
			<span>${esc(o.buyer.name || '—')}</span>
			<span>${eur(o.totals.grossTotal)}</span>
			${o.validUntil ? `<span class="muted">${t('gültig bis {date}', { date: esc(o.validUntil) })}</span>` : ''}
			${o.acceptedAt ? `<span class="muted">${t('angenommen am {date}', { date: esc(o.acceptedAt.slice(0, 10)) })}</span>` : ''}
			${
				o.rejectedAt
					? `<span class="muted">${t('abgelehnt am {date}', { date: esc(o.rejectedAt.slice(0, 10)) })}${
							o.rejectionReason ? `: ${esc(o.rejectionReason)}` : ''
						}</span>`
					: ''
			}
			<a href="#/invoices/${esc(o.id)}">${t('Ansehen')}</a>
			${o.status === 'draft' ? `<a href="#/edit/${esc(o.id)}">${t('Bearbeiten')}</a>` : ''}
			${o.status === 'draft' ? `<button data-issue="${esc(o.id)}">${t('Ausstellen')}</button>` : ''}
			${
				state === 'open' || state === 'expired'
					? `<button data-accept="${esc(o.id)}">${t('Annehmen')}</button>
						<button class="secondary" data-reject="${esc(o.id)}">${t('Ablehnen')}</button>`
					: ''
			}
			${state !== 'draft' ? `<button class="secondary" data-convert="${esc(o.id)}">${t('In Rechnung umwandeln')}</button>` : ''}
			${
				o.status === 'draft'
					? `<button class="secondary" data-del="${esc(o.id)}" title="${t('Entwurf endgültig verwerfen')}">${t('Löschen')}</button>`
					: ''
			}
		</div></div>`;
	}

	async function load(): Promise<void> {
		// guard against out-of-order responses overwriting a newer result
		const seq = ++loadSeq;
		const want = stateEl.value as QuoteState | '';
		const params: Record<string, string> = { docType: 'quote', sort: sortEl.value, order };
		// the API knows draft/issued/cancelled; the finer states are derived here
		if (want) {
			params.status = want === 'draft' ? 'draft' : 'issued';
		}
		if (qEl.value.trim()) {
			params.q = qEl.value.trim();
		}
		try {
			const items = (await api.list(params)).filter(o => !want || quoteState(o) === want);
			if (seq !== loadSeq) {
				return;
			}
			shown = items;
			visibleDrafts = items.filter(o => o.status === 'draft').map(o => o.id);
			const issueAll = root.querySelector<HTMLButtonElement>('#o-issue-all')!;
			issueAll.hidden = visibleDrafts.length === 0;
			issueAll.textContent = `${t('Ausstellen')} (${visibleDrafts.length})`;
			listEl.innerHTML =
				items.map(row).join('') || `<div class="card muted">${t('Keine Angebote gefunden.')}</div>`;
			bindRows();
		} catch (e) {
			if (seq === loadSeq) {
				listEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
			}
		}
	}

	/**
	 * Runs one action, refreshes the list and reports the outcome.
	 *
	 * @param run - Function to run.
	 * @param done - Called when finished.
	 */
	async function act(run: () => Promise<unknown>, done: string): Promise<void> {
		errEl.innerHTML = `<div class="card muted">${esc(done)}</div>`;
		try {
			await run();
			await load();
		} catch (e) {
			fail(e);
		}
	}

	/** Binds the row actions of the freshly rendered list. */
	function bindRows(): void {
		listEl.querySelectorAll<HTMLElement>('[data-issue]').forEach(btn =>
			btn.addEventListener('click', async () => {
				if (!window.confirm(lbl.issueConfirm)) {
					return;
				}
				await act(() => api.issue(btn.dataset.issue ?? ''), t('Angebot ausgestellt.'));
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-accept]').forEach(btn =>
			btn.addEventListener('click', async () => {
				if (!window.confirm(t('Angebot als angenommen vermerken? Die Entscheidung ist endgültig.'))) {
					return;
				}
				await act(() => api.quoteAccept(btn.dataset.accept ?? ''), t('Annahme vermerkt.'));
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-reject]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const reason = window.prompt(t('Grund der Ablehnung (erscheint auf dem Angebot):'), '');
				if (reason === null) {
					return;
				}
				await act(
					() => api.quoteReject(btn.dataset.reject ?? '', reason.trim() || undefined),
					t('Ablehnung vermerkt.'),
				);
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-convert]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const id = btn.dataset.convert ?? '';
				// the server refuses a conversion without the recorded "yes"
				// unless we say so — that is the deal agreed by phone
				const accepted = !!shown.find(o => o.id === id)?.acceptedAt;
				if (
					!accepted &&
					!window.confirm(
						t(
							'Das Angebot ist nicht als angenommen vermerkt. Trotzdem einen Rechnungsentwurf daraus erstellen?',
						),
					)
				) {
					return;
				}
				try {
					const draft = await api.convert(id, accepted);
					errEl.innerHTML =
						`<div class="card muted">${t('Rechnungsentwurf erstellt – Nummer und PDF folgen beim Ausstellen.')} ` +
						`<a href="#/edit/${esc(draft.id)}">${t('Öffnen')}</a></div>`;
					await load();
				} catch (e) {
					fail(e);
				}
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-del]').forEach(btn =>
			btn.addEventListener('click', async () => {
				if (!window.confirm(t('Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen.'))) {
					return;
				}
				await act(() => api.deleteDraft(btn.dataset.del ?? ''), t('Entwurf gelöscht.'));
			}),
		);
	}

	stateEl.onchange = () => void load();
	sortEl.onchange = () => void load();
	orderBtn.onclick = () => {
		order = order === 'desc' ? 'asc' : 'desc';
		orderBtn.textContent = order === 'desc' ? `↓ ${t('absteigend')}` : `↑ ${t('aufsteigend')}`;
		void load();
	};
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	qEl.oninput = () => {
		// debounce: one request per pause instead of one per keystroke
		if (searchTimer !== undefined) {
			clearTimeout(searchTimer);
		}
		searchTimer = setTimeout(() => void load(), 250);
	};

	root.querySelector('#o-issue-all')?.addEventListener('click', async () => {
		if (
			!window.confirm(
				t(
					'{n} Angebots-Entwurf/Entwürfe ausstellen? Jedes bekommt eine eigene Nummer und seine PDF. Danach ist keine Änderung mehr möglich.',
					{
						n: visibleDrafts.length,
					},
				),
			)
		) {
			return;
		}
		try {
			const res = await api.issueBatch(visibleDrafts);
			errEl.innerHTML = `<div class="card ${
				res.failed.length ? 'error' : 'muted'
			}">${t('{n} ausgestellt', { n: res.issued.length })}${
				res.failed.length
					? `, ${t('{n} fehlgeschlagen', { n: res.failed.length })}: ${esc(res.failed[0].error ?? '')}`
					: ''
			}.</div>`;
			await load();
		} catch (e) {
			fail(e);
		}
	});

	await load();
}
