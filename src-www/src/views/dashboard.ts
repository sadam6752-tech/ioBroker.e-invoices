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
			<input id="f-q" placeholder="Suche (Nr, Kunde)…" style="max-width:220px" />
			<a class="btn" href="#/new">+ Neu</a>
			<button class="btn secondary" id="f-export">Excel</button>
		</div></div>
		<div id="list"></div>
		<div id="list-err"></div>`;

	const statusEl = root.querySelector<HTMLSelectElement>('#f-status')!;
	const qEl = root.querySelector<HTMLInputElement>('#f-q')!;
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

	async function runStorno(id: string): Promise<void> {
		const reason = window.prompt('Grund für den Storno (erscheint auf der Gutschrift):', 'Falsch ausgestellt');
		if (reason === null) {
			return;
		}
		if (
			!window.confirm(
				'Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?',
			)
		) {
			return;
		}
		try {
			const { reversal } = await api.storno(id, reason.trim() || undefined);
			location.hash = `#/edit/${reversal.id}`;
			location.reload();
		} catch (e) {
			fail(e);
		}
	}

	async function load(): Promise<void> {
		// guard against out-of-order responses overwriting a newer result
		const seq = ++loadSeq;
		const params: Record<string, string> = {};
		if (statusEl.value) params.status = statusEl.value;
		if (qEl.value.trim()) params.q = qEl.value.trim();
		try {
			const items = await api.list(params);
			if (seq !== loadSeq) {
				return;
			}
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
					<a href="#/invoices/${esc(i.id)}">Ansehen</a>
					${i.status === 'draft' ? `<a href="#/edit/${esc(i.id)}">Bearbeiten</a>` : ''}
					${i.status === 'issued' ? `<button class="secondary" data-storno="${esc(i.id)}">Storno</button>` : ''}
					${i.pdfPath ? `<button class="secondary" data-dl="pdf:${esc(i.id)}:${esc(i.number ?? 'rechnung')}">PDF ↓</button>` : ''}
					${i.xml ? `<button class="secondary" data-dl="xml:${esc(i.id)}:${esc(i.number ?? 'rechnung')}">XML ↓</button>` : ''}
				</div></div>`,
					)
					.join('') || `<div class="card muted">Keine Rechnungen gefunden.</div>`;
			listEl.querySelectorAll<HTMLInputElement>('[data-paid]').forEach(box =>
				box.addEventListener('change', () => {
					void togglePaid(box);
				}),
			);
			listEl.querySelectorAll('[data-storno]').forEach(btn =>
				btn.addEventListener('click', () => {
					void runStorno((btn as HTMLElement).dataset.storno ?? '');
				}),
			);
			listEl.querySelectorAll('[data-dl]').forEach(btn =>
				btn.addEventListener('click', async () => {
					const [kind, id, name] = ((btn as HTMLElement).dataset.dl ?? '').split(':');
				 const url = kind === 'pdf' ? api.pdfUrl(id) : api.xmlUrl(id);
					try {
						await downloadUrl(url, `${name}.${kind}`);
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
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	qEl.oninput = () => {
		// debounce: one request per pause instead of one per keystroke
		if (searchTimer !== undefined) {
			clearTimeout(searchTimer);
		}
		searchTimer = setTimeout(() => void load(), 250);
	};

	root.querySelector('#f-export')?.addEventListener('click', async () => {
		const params: Record<string, string> = {};
		if (statusEl.value) params.status = statusEl.value;
		if (qEl.value.trim()) params.q = qEl.value.trim();
		try {
			await downloadUrl(api.exportUrl(params), 'export.xlsx');
		} catch (e) {
			fail(e);
		}
	});
	await load();
}
