import { api, esc, eur, type Invoice } from '../api';
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
 * @param root
 */
export async function offers(root: HTMLElement): Promise<void> {
	const lbl = labels('quote');
	root.innerHTML = `
		<div class="card">
			<div class="row"><strong>${esc(lbl.plural)}</strong></div>
			<div class="row filters">
				<select id="o-state" title="Zustand">
					<option value="">alle</option>
					<option value="draft">Entwurf</option>
					<option value="open">Offen</option>
					<option value="accepted">Angenommen</option>
					<option value="rejected">Abgelehnt</option>
					<option value="expired">Verfallen</option>
				</select>
				<select id="o-sort" title="Sortierung">
					<option value="date">Datum</option>
					<option value="number">Nummer</option>
					<option value="amount">Betrag</option>
					<option value="customer">Kunde</option>
				</select>
			</div>
			<div class="row actions">
				<input id="o-q" placeholder="Suche (Nr, Kunde, Position)…" />
				<button class="btn secondary" id="o-order" title="Umschalten aufsteigend/absteigend">↓ absteigend</button>
				<a class="btn" href="#/new/quote">${esc(lbl.newOne)}</a>
				<button class="btn secondary" id="o-issue-all" title="Alle sichtbaren Entwürfe ausstellen" hidden>Ausstellen (0)</button>
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
	 * @param e
	 */
	function fail(e: unknown): void {
		errEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}

	/**
	 * One row: number, state, customer, amount, validity and the actions.
	 *
	 * @param o
	 */
	function row(o: Invoice): string {
		const state = quoteState(o);
		return `<div class="card"><div class="row">
			<strong>${esc(o.number ?? '(Entwurf)')}</strong>
			<span class="badge ${state}">${quoteStateLabel(state)}</span>
			<span>${esc(o.buyer.name || '—')}</span>
			<span>${eur(o.totals.grossTotal)}</span>
			${o.validUntil ? `<span class="muted">gültig bis ${esc(o.validUntil)}</span>` : ''}
			${o.acceptedAt ? `<span class="muted">angenommen am ${esc(o.acceptedAt.slice(0, 10))}</span>` : ''}
			${
				o.rejectedAt
					? `<span class="muted">abgelehnt am ${esc(o.rejectedAt.slice(0, 10))}${
							o.rejectionReason ? `: ${esc(o.rejectionReason)}` : ''
						}</span>`
					: ''
			}
			<a href="#/invoices/${esc(o.id)}">Ansehen</a>
			${o.status === 'draft' ? `<a href="#/edit/${esc(o.id)}">Bearbeiten</a>` : ''}
			${o.status === 'draft' ? `<button data-issue="${esc(o.id)}">Ausstellen</button>` : ''}
			${
				state === 'open' || state === 'expired'
					? `<button data-accept="${esc(o.id)}">Annehmen</button>
						<button class="secondary" data-reject="${esc(o.id)}">Ablehnen</button>`
					: ''
			}
			${state !== 'draft' ? `<button class="secondary" data-convert="${esc(o.id)}">In Rechnung umwandeln</button>` : ''}
			${
				o.status === 'draft'
					? `<button class="secondary" data-del="${esc(o.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`
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
			issueAll.textContent = `Ausstellen (${visibleDrafts.length})`;
			listEl.innerHTML = items.map(row).join('') || `<div class="card muted">Keine Angebote gefunden.</div>`;
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
	 * @param run
	 * @param done
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
				await act(() => api.issue(btn.dataset.issue ?? ''), 'Angebot ausgestellt.');
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-accept]').forEach(btn =>
			btn.addEventListener('click', async () => {
				if (!window.confirm('Angebot als angenommen vermerken? Die Entscheidung ist endgültig.')) {
					return;
				}
				await act(() => api.quoteAccept(btn.dataset.accept ?? ''), 'Annahme vermerkt.');
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-reject]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const reason = window.prompt('Grund der Ablehnung (erscheint auf dem Angebot):', '');
				if (reason === null) {
					return;
				}
				await act(
					() => api.quoteReject(btn.dataset.reject ?? '', reason.trim() || undefined),
					'Ablehnung vermerkt.',
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
						'Das Angebot ist nicht als angenommen vermerkt. Trotzdem einen Rechnungsentwurf daraus erstellen?',
					)
				) {
					return;
				}
				try {
					const draft = await api.convert(id, accepted);
					errEl.innerHTML =
						`<div class="card muted">Rechnungsentwurf erstellt – Nummer und PDF folgen beim Ausstellen. ` +
						`<a href="#/edit/${esc(draft.id)}">Öffnen</a></div>`;
					await load();
				} catch (e) {
					fail(e);
				}
			}),
		);
		listEl.querySelectorAll<HTMLElement>('[data-del]').forEach(btn =>
			btn.addEventListener('click', async () => {
				if (!window.confirm('Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen.')) {
					return;
				}
				await act(() => api.deleteDraft(btn.dataset.del ?? ''), 'Entwurf gelöscht.');
			}),
		);
	}

	stateEl.onchange = () => void load();
	sortEl.onchange = () => void load();
	orderBtn.onclick = () => {
		order = order === 'desc' ? 'asc' : 'desc';
		orderBtn.textContent = order === 'desc' ? '↓ absteigend' : '↑ aufsteigend';
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
				`${visibleDrafts.length} Angebots-Entwurf/Entwürfe ausstellen? Jedes bekommt eine eigene Nummer und ` +
					`seine PDF. Danach ist keine Änderung mehr möglich.`,
			)
		) {
			return;
		}
		try {
			const res = await api.issueBatch(visibleDrafts);
			errEl.innerHTML = `<div class="card ${
				res.failed.length ? 'error' : 'muted'
			}">${res.issued.length} ausgestellt${
				res.failed.length ? `, ${res.failed.length} fehlgeschlagen: ${esc(res.failed[0].error ?? '')}` : ''
			}.</div>`;
			await load();
		} catch (e) {
			fail(e);
		}
	});

	await load();
}
