import { api, downloadUrl, esc, eur, type Invoice } from '../api';

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

	function fail(e: unknown): void {
		errEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}

	async function load(): Promise<void> {
		const params: Record<string, string> = {};
		if (statusEl.value) params.status = statusEl.value;
		if (qEl.value.trim()) params.q = qEl.value.trim();
		try {
			const items = await api.list(params);
			listEl.innerHTML =
				items
					.map(
						i => `<div class="card"><div class="row">
					<strong>${esc(i.number ?? '(Entwurf)')}</strong>${badge(i.status)}
					<span>${esc(i.buyer.name || '—')}</span>
					<span>${eur(i.totals.grossTotal)}</span>
					<a href="#/invoices/${esc(i.id)}">Ansehen</a>
					${i.status === 'draft' ? `<a href="#/edit/${esc(i.id)}">Bearbeiten</a>` : ''}
					${i.pdfPath ? `<button class="secondary" data-dl="pdf:${esc(i.id)}:${esc(i.number ?? 'rechnung')}">PDF ↓</button>` : ''}
					${i.xml ? `<button class="secondary" data-dl="xml:${esc(i.id)}:${esc(i.number ?? 'rechnung')}">XML ↓</button>` : ''}
				</div></div>`,
					)
					.join('') || `<div class="card muted">Keine Rechnungen gefunden.</div>`;
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
			listEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		}
	}
	statusEl.onchange = () => void load();
	qEl.oninput = () => void load();

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
