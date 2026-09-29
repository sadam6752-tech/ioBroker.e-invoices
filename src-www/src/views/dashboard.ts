import { api, downloadUrl, esc, eur, type Invoice } from '../api';

/** Cash discount amount for an invoice, in EUR. */
function skontoOf(i: Invoice): number {
	return Math.round((i.totals.grossTotal * (Number(i.skontoPercent) || 0)) / 100 * 100) / 100;
}

function badge(status: Invoice['status']): string {
	return `<span class="badge ${status}">${status}</span>`;
}

/** Dashboard: invoice list with status filter and search. */
export async function dashboard(root: HTMLElement): Promise<void> {
	root.innerHTML = `
		<div class="card"><div class="row">
			<strong>Rechnungen</strong>
			<select id="f-status">
				<option value="">alle</option>
				<option value="draft">draft</option>
				<option value="issued">issued</option>
				<option value="cancelled">cancelled</option>
			</select>
			<input id="f-q" placeholder="Suche (Nr, Kunde, Position)…" style="max-width:260px" />
			<select id="f-sort" title="Sortierung">
				<option value="date">Datum</option>
				<option value="number">Nummer</option>
				<option value="amount">Betrag</option>
				<option value="customer">Kunde</option>
				<option value="due">Fällig</option>
			</select>
			<button class="btn secondary" id="f-order" title="Umschalten aufsteigend/absteigend">↓ absteigend</button>
			<select id="f-sent" title="Versandstatus">
				<option value="">alle</option>
				<option value="1">versendet</option>
				<option value="0">nicht versendet</option>
			</select>
			<a class="btn" href="#/new">+ Neu</a>
			<button class="btn secondary" id="f-export" title="Excel-Liste">Excel</button>
			<button class="btn secondary" id="f-csv" title="CSV für die Buchhaltung">CSV</button>
			<button class="btn secondary" id="f-datev" title="DATEV-Buchungssätze">DATEV</button>
			<button class="btn secondary" id="f-issue-all" title="Alle sichtbaren Entwürfe ausstellen" hidden>Ausstellen (0)</button>
		</div></div>
		<div id="reminders"></div>
		<div id="list-err"></div>
		<div id="list"></div>`;

	const statusEl = root.querySelector<HTMLSelectElement>('#f-status')!;
	const qEl = root.querySelector<HTMLInputElement>('#f-q')!;
	const sortEl = root.querySelector<HTMLSelectElement>('#f-sort')!;
	const orderBtn = root.querySelector<HTMLButtonElement>('#f-order')!;
	const sentEl = root.querySelector<HTMLSelectElement>('#f-sent')!;
	const remindersEl = root.querySelector('#reminders')!;
	/** Current sort direction, toggled by the order button. */
	let order: 'asc' | 'desc' = 'desc';
	/** Draft ids currently visible, for the batch issue. */
	let visibleDrafts: string[] = [];
	const listEl = root.querySelector('#list')!;
	const errEl = root.querySelector('#list-err')!;
	/** Monotonic request counter to discard stale responses. */
	let loadSeq = 0;

	function fail(e: unknown): void {
		errEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}

	async function togglePaid(box: HTMLInputElement): Promise<void> {
		const id = box.dataset.paid ?? '';
		const want = box.checked;
		box.disabled = true;
		try {
			await api.setPaid(id, want);
			errEl.innerHTML = `<div class="card muted">${want ? 'Als bezahlt markiert.' : 'Zahlung zurückgenommen.'}</div>`;
			await load();
		} catch (e) {
			box.checked = !want;
			fail(e);
		} finally {
			box.disabled = false;
		}
	}

	async function load(): Promise<void> {
		// guard against out-of-order responses overwriting a newer result
		const seq = ++loadSeq;
		const params: Record<string, string> = { sort: sortEl.value, order };
		if (statusEl.value) params.status = statusEl.value;
		if (qEl.value.trim()) params.q = qEl.value.trim();
		if (sentEl.value) params.sent = sentEl.value;
		try {
			const items = await api.list(params);
			if (seq !== loadSeq) {
				return;
			}
			visibleDrafts = items.filter(i => i.status === 'draft').map(i => i.id);
			const issueAll = root.querySelector<HTMLButtonElement>('#f-issue-all')!;
			issueAll.hidden = visibleDrafts.length === 0;
			issueAll.textContent = `Ausstellen (${visibleDrafts.length})`;
			listEl.innerHTML =
				items
					.map(
						i => `<div class="card"><div class="row">
					${
						i.status === 'draft'
							? '<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>'
							: `<label class="pay" title="${i.paid ? `Ausgeglichen am ${esc((i.paidAt ?? '').slice(0, 10))}` : 'Als bezahlt markieren'}">
								<input type="checkbox" data-paid="${esc(i.id)}" ${i.paid ? 'checked' : ''} /><span>bezahlt</span></label>`
					}
					<strong>${esc(i.number ?? '(Entwurf)')}</strong>${badge(i.status)}
					<span>${esc(i.buyer.name || '—')}</span>
					<span>${eur(i.totals.grossTotal)}</span>
					${i.skontoPercent > 0 && !i.paid ? `<span class="muted">${eur(i.totals.grossTotal - skontoOf(i))} bei ${esc(i.skontoPercent)} % Skonto</span>` : ''}
					${i.stornoOfId ? '<span class="badge cancelled">Storno</span>' : ''}
					${
						i.status === 'issued'
							? i.sentAt
								? `<span class="badge issued" title="Über ${esc(
										i.sendChannel ?? 'E-Mail',
									)} versendet am ${esc(i.sentAt.slice(0, 10))}">versendet</span>`
								: `<button class="secondary" data-sent="${esc(i.id)}" title="Als versendet markieren">nicht versendet</button>`
							: ''
					}
					<a href="#/invoices/${esc(i.id)}">Ansehen</a>
					${i.status === 'draft' ? `<a href="#/edit/${esc(i.id)}">Bearbeiten</a>` : ''}
					${
						i.status === 'draft'
							? `<button class="secondary" data-del="${esc(i.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`
							: ''
					}
				</div></div>`,
					)
					.join('') || `<div class="card muted">Keine Rechnungen gefunden.</div>`;
			listEl.querySelectorAll<HTMLInputElement>('[data-paid]').forEach(box =>
				box.addEventListener('change', () => {
					void togglePaid(box);
				}),
			);
			listEl.querySelectorAll('[data-sent]').forEach(btn =>
				btn.addEventListener('click', async () => {
					try {
						await api.markSent((btn as HTMLElement).dataset.sent ?? '', 'E-Mail');
						await load();
					} catch (e) {
						fail(e);
					}
				}),
			);
			listEl.querySelectorAll('[data-del]').forEach(btn =>
				btn.addEventListener('click', async () => {
					if (!window.confirm('Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen.')) {
						return;
					}
					try {
						await api.deleteDraft((btn as HTMLElement).dataset.del ?? '');
						errEl.innerHTML = `<div class="card muted">Entwurf gelöscht.</div>`;
						await load();
					} catch (e) {
						fail(e);
					}
				}),
			);
		} catch (e) {
			if (seq !== loadSeq) {
				return;
			}
			listEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		}
	}
	statusEl.onchange = () => void load();
	sortEl.onchange = () => void load();
	sentEl.onchange = () => void load();
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

	root.querySelector('#f-issue-all')?.addEventListener('click', async () => {
		if (
			!window.confirm(
				`${visibleDrafts.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`,
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

	/** Shared filter for the three export formats. */
	const exportParams = (): Record<string, string> => {
		const params: Record<string, string> = {};
		if (statusEl.value) params.status = statusEl.value;
		if (qEl.value.trim()) params.q = qEl.value.trim();
		return params;
	};
	root.querySelector('#f-export')?.addEventListener('click', async () => {
		try {
			await downloadUrl(api.exportUrl(exportParams()), 'export.xlsx');
		} catch (e) {
			fail(e);
		}
	});
	root.querySelector('#f-csv')?.addEventListener('click', async () => {
		try {
			await downloadUrl(api.csvUrl(exportParams()), 'rechnungen.csv');
		} catch (e) {
			fail(e);
		}
	});
	root.querySelector('#f-datev')?.addEventListener('click', async () => {
		try {
			await downloadUrl(api.datevUrl(exportParams()), 'rechnungen.datev');
		} catch (e) {
			fail(e);
		}
	});

	// Overdue invoices: the adapter reminds, the user decides and sends.
	async function loadReminders(): Promise<void> {
		try {
			const due = await api.reminders();
			if (!due.length) {
				remindersEl.innerHTML = '';
				return;
			}
			remindersEl.innerHTML = `<div class="card"><div class="row">
				<strong>Überfällig: ${due.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${due
				.map(
					c => `<div class="card" style="flex:1">
						<strong>${esc(c.invoice.number ?? '')}</strong> ${esc(c.invoice.buyer.name)}
						<br /><span class="muted">${c.overdueDays} Tage überfällig · Stufe ${c.level}${
							c.skontoActive
								? ` · Skonto ${esc(c.invoice.skontoPercent)} % noch möglich bis ${esc(
										c.invoice.skontoDueDate ?? '',
									)}`
								: ''
						}</span>
						<br /><a href="#/invoices/${esc(c.invoice.id)}">Ansehen</a>
					</div>`,
				)
				.join('')}</div></div>`;
		} catch {
			// the reminder panel is informational, never block the list
		}
	}

	await load();
	await loadReminders();
}
