import { api, downloadUrl, esc, eur, type Invoice } from '../api';
import { t } from '../i18n';
import { statusLabel } from '../labels';

/**
 * Cash discount amount for an invoice, in EUR.
 *
 * @param i
 */
function skontoOf(i: Invoice): number {
	return Math.round(((i.totals.grossTotal * (Number(i.skontoPercent) || 0)) / 100) * 100) / 100;
}

function badge(status: Invoice['status']): string {
	return `<span class="badge ${status}">${statusLabel(status)}</span>`;
}

/**
 * Dashboard: invoice list with status filter and search.
 *
 * @param root
 */
export async function dashboard(root: HTMLElement): Promise<void> {
	// Two lines instead of one crowded row: the filters read as one group, the
	// search and the buttons as another (the same shape the offer list uses).
	root.innerHTML = `
		<div class="card">
			<div class="row"><strong>${t('Rechnungen')}</strong></div>
			<div class="row filters">
				<select id="f-status">
					<option value="">${t('alle')}</option>
					<option value="draft">${statusLabel('draft')}</option>
					<option value="issued">${statusLabel('issued')}</option>
					<option value="cancelled">${statusLabel('cancelled')}</option>
				</select>
				<select id="f-sort" title="${t('Sortierung')}">
					<option value="date">${t('Datum')}</option>
					<option value="number">${t('Nummer')}</option>
					<option value="amount">${t('Betrag')}</option>
					<option value="customer">${t('Kunde')}</option>
					<option value="due">${t('Fällig')}</option>
				</select>
				<select id="f-sent" title="${t('Versandstatus')}">
					<option value="">${t('alle')}</option>
					<option value="1">${t('versendet')}</option>
					<option value="0">${t('nicht versendet')}</option>
				</select>
			</div>
			<div class="row actions">
				<input id="f-q" placeholder="${t('Suche (Nr, Kunde, Position)…')}" />
				<button class="btn secondary" id="f-order" title="${t('Umschalten aufsteigend/absteigend')}">↓ ${t('absteigend')}</button>
				<a class="btn" href="#/new">${t('+ Neu')}</a>
				<button class="btn secondary" id="f-export" title="${t('Excel-Liste')}">Excel</button>
				<button class="btn secondary" id="f-csv" title="${t('CSV für die Buchhaltung')}">CSV</button>
				<button class="btn secondary" id="f-datev" title="${t('DATEV-Buchungssätze')}">DATEV</button>
				<button class="btn secondary" id="f-issue-all" title="${t('Alle sichtbaren Entwürfe ausstellen')}" hidden>${t('Ausstellen')} (0)</button>
			</div>
		</div>
		<div id="open-tile"></div>
		<div id="reminders"></div>
		<div id="list-err"></div>
		<div id="list"></div>`;

	const statusEl = root.querySelector<HTMLSelectElement>('#f-status')!;
	const qEl = root.querySelector<HTMLInputElement>('#f-q')!;
	const sortEl = root.querySelector<HTMLSelectElement>('#f-sort')!;
	const orderBtn = root.querySelector<HTMLButtonElement>('#f-order')!;
	const sentEl = root.querySelector<HTMLSelectElement>('#f-sent')!;
	const remindersEl = root.querySelector('#reminders')!;
	const openTileEl = root.querySelector('#open-tile')!;
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
			errEl.innerHTML = `<div class="card muted">${want ? t('Als bezahlt markiert.') : t('Zahlung zurückgenommen.')}</div>`;
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
		// R8: this is the booking list. Offers are their own document type with
		// their own number circle and have their own tab (#/offers).
		params.docType = 'invoice';
		if (statusEl.value) {
			params.status = statusEl.value;
		}
		if (qEl.value.trim()) {
			params.q = qEl.value.trim();
		}
		if (sentEl.value) {
			params.sent = sentEl.value;
		}
		try {
			const items = await api.list(params);
			if (seq !== loadSeq) {
				return;
			}
			visibleDrafts = items.filter(i => i.status === 'draft').map(i => i.id);
			const issueAll = root.querySelector<HTMLButtonElement>('#f-issue-all')!;
			issueAll.hidden = visibleDrafts.length === 0;
			issueAll.textContent = `${t('Ausstellen')} (${visibleDrafts.length})`;
			listEl.innerHTML =
				items
					.map(
						i => `<div class="card"><div class="row">
					${
						i.status === 'draft'
							? `<span class="pay-box" title="${t('Entwurf kann nicht als bezahlt markiert werden')}"></span>`
							: `<label class="pay" title="${i.paid ? t('Ausgeglichen am {date}', { date: esc((i.paidAt ?? '').slice(0, 10)) }) : t('Als bezahlt markieren')}">
								<input type="checkbox" data-paid="${esc(i.id)}" ${i.paid ? 'checked' : ''} /><span>${t('bezahlt')}</span></label>`
					}
					<strong>${esc(i.number ?? t('(Entwurf)'))}</strong>${badge(i.status)}
					<span>${esc(i.buyer.name || '—')}</span>
					<span>${eur(i.totals.grossTotal)}</span>
					${i.skontoPercent > 0 && !i.paid ? `<span class="muted">${t('{amount} bei {percent} % Skonto', { amount: eur(i.totals.grossTotal - skontoOf(i)), percent: esc(i.skontoPercent) })}</span>` : ''}
					${i.stornoOfId ? `<span class="badge cancelled">${t('Storno')}</span>` : ''}
					${
						i.status === 'issued'
							? i.sentAt
								? `<span class="badge issued" title="${t('Über {channel} versendet am {date}', {
										channel: esc(i.sendChannel ?? 'E-Mail'),
										date: esc(i.sentAt.slice(0, 10)),
									})}">${t('versendet')}</span>`
								: `<button class="secondary" data-sent="${esc(i.id)}" title="${t('Als versendet markieren')}">${t('nicht versendet')}</button>`
							: ''
					}
					<a href="#/invoices/${esc(i.id)}">${t('Ansehen')}</a>
					${i.status === 'draft' ? `<a href="#/edit/${esc(i.id)}">${t('Bearbeiten')}</a>` : ''}
					${
						i.status === 'draft'
							? `<button class="secondary" data-del="${esc(i.id)}" title="${t('Entwurf endgültig verwerfen')}">${t('Löschen')}</button>`
							: ''
					}
				</div></div>`,
					)
					.join('') || `<div class="card muted">${t('Keine Rechnungen gefunden.')}</div>`;
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
					if (!window.confirm(t('Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen.'))) {
						return;
					}
					try {
						await api.deleteDraft((btn as HTMLElement).dataset.del ?? '');
						errEl.innerHTML = `<div class="card muted">${t('Entwurf gelöscht.')}</div>`;
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

	root.querySelector('#f-issue-all')?.addEventListener('click', async () => {
		if (
			!window.confirm(
				t(
					'{n} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.',
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

	/** Shared filter for the three export formats. */
	const exportParams = (): Record<string, string> => {
		const params: Record<string, string> = {};
		// R8: accounting sees invoices only; offers never book.
		params.docType = 'invoice';
		if (statusEl.value) {
			params.status = statusEl.value;
		}
		if (qEl.value.trim()) {
			params.q = qEl.value.trim();
		}
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

	// Open items (R6.2): one line with the claim and its overdue part, linking to the aging list.
	async function loadOpenTile(): Promise<void> {
		try {
			const report = await api.openItems();
			if (report.total.count === 0) {
				openTileEl.innerHTML = '';
				return;
			}
			openTileEl.innerHTML = `<div class="card"><div class="row">
				<strong>${t('Offene Posten')}</strong>
				<span>${t('{n} offen', { n: report.total.count })} · ${eur(report.total.amount)}</span>
				<span class="${report.overdue.count > 0 ? 'error' : 'muted'}">${t('davon überfällig')}: ${report.overdue.count} · ${eur(report.overdue.amount)}</span>
				<a href="#/open-items">${t('Alterungsliste')}</a>
			</div></div>`;
		} catch {
			// the tile is informational, never block the list
		}
	}

	// Overdue invoices: the adapter reminds, the user decides and sends.
	async function loadReminders(): Promise<void> {
		try {
			const due = await api.reminders();
			if (!due.length) {
				remindersEl.innerHTML = '';
				return;
			}
			remindersEl.innerHTML = `<div class="card"><div class="row">
				<strong>${t('Überfällig')}: ${due.length}</strong>
				<span class="muted">${t('Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.')}</span>
			</div><div class="row">${due
				.map(
					c => `<div class="card" style="flex:1">
						<strong>${esc(c.invoice.number ?? '')}</strong> ${esc(c.invoice.buyer.name)}
						<br /><span class="muted">${t('{days} Tage überfällig · Stufe {level}', { days: c.overdueDays, level: c.level })}${
							c.skontoActive
								? ` · ${t('Skonto {percent} % noch möglich bis {date}', {
										percent: esc(c.invoice.skontoPercent),
										date: esc(c.invoice.skontoDueDate ?? ''),
									})}`
								: ''
						}</span>
						<br /><a href="#/invoices/${esc(c.invoice.id)}">${t('Ansehen')}</a>
					</div>`,
				)
				.join('')}</div></div>`;
		} catch {
			// the reminder panel is informational, never block the list
		}
	}

	await load();
	await loadOpenTile();
	await loadReminders();
}
