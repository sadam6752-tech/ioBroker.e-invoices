import { api, esc, eur, type Invoice } from '../api';

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
			<a class="btn secondary" id="f-export" href="#">Excel</a>
		</div></div>
		<div id="list"></div>`;

	const statusEl = root.querySelector<HTMLSelectElement>('#f-status')!;
	const qEl = root.querySelector<HTMLInputElement>('#f-q')!;
	const listEl = root.querySelector('#list')!;

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
					${i.pdfPath ? `<a href="${api.pdfUrl(i.id)}" download="${esc(i.number ?? 'rechnung')}.pdf">PDF ↓</a>` : ''}
					${i.xml ? `<a href="${api.xmlUrl(i.id)}" download="${esc(i.number ?? 'rechnung')}.xml">XML ↓</a>` : ''}
				</div></div>`,
					)
					.join('') || `<div class="card muted">Keine Rechnungen gefunden.</div>`;
		} catch (e) {
			listEl.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		}
	}
	statusEl.onchange = () => {
		syncExport();
		void load();
	};
	qEl.oninput = () => {
		syncExport();
		void load();
	};

	function syncExport(): void {
		const params: Record<string, string> = {};
		if (statusEl.value) params.status = statusEl.value;
		if (qEl.value.trim()) params.q = qEl.value.trim();
		root.querySelector<HTMLAnchorElement>('#f-export')!.href = api.exportUrl(params);
	}
	syncExport();
	await load();
}
