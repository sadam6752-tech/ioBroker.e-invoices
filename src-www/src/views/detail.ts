import { api, esc, eur } from '../api';

/** Invoice detail: fields, validation, downloads, issue action. */
export async function detail(root: HTMLElement, id: string): Promise<void> {
	root.innerHTML = `<div class="card">Lade…</div>`;
	try {
		const inv = await api.get(id);
		root.innerHTML = `
			<div class="card"><div class="row">
				<strong>${esc(inv.number ?? '(Entwurf)')}</strong>
				<span class="badge ${inv.status}">${inv.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${esc(inv.seller.name)}<br />${esc(inv.seller.street)}<br />${esc(inv.seller.zip)} ${esc(inv.seller.city)}</div>
				<div><strong>Käufer</strong><br />${esc(inv.buyer.name)}<br />${esc(inv.buyer.street)}<br />${esc(inv.buyer.zip)} ${esc(inv.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${esc(inv.issueDate)} · Leistung: ${esc(inv.deliveryDate)}${inv.dueDate ? ` · Fällig: ${esc(inv.dueDate)}` : ''}</p>
			<table class="lines"><tr><th>#</th><th>Beschreibung</th><th>Menge</th><th>USt</th><th>Netto</th></tr>
			${inv.lines
				.map(
					(l, i) =>
						`<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${l.quantity} ${esc(l.unit)}</td><td>${l.vatRate} %</td><td>${eur(l.quantity * l.unitPriceNet)}</td></tr>`,
				)
				.join('')}
			</table>
			<p><strong>Gesamt: ${eur(inv.totals.grossTotal)}</strong> <span class="muted">(netto ${eur(inv.totals.netTotal)} + USt ${eur(inv.totals.taxTotal)})</span></p>
			${inv.notes ? `<p class="muted">Notiz: ${esc(inv.notes)}</p>` : ''}
			</div>
			<div class="card"><div class="row">
				${inv.status === 'draft' ? `<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>` : ''}
				<button class="secondary" id="d-validate">Validieren</button>
				${inv.pdfPath ? `<a class="btn secondary" href="${api.pdfUrl(inv.id)}" target="_blank" rel="noopener">PDF ansehen</a>` : ''}
				${inv.pdfPath ? `<a class="btn secondary" href="${api.pdfUrl(inv.id)}" download="${esc(inv.number ?? 'rechnung')}.pdf">PDF ↓</a>` : ''}
				${inv.xml ? `<a class="btn secondary" href="${api.xmlUrl(inv.id)}" download="${esc(inv.number ?? 'rechnung')}.xml">XML ↓</a>` : ''}
				${inv.xlsxPath ? `<a class="btn secondary" href="${api.xlsxUrl(inv.id)}" download="${esc(inv.number ?? 'rechnung')}.xlsx">Excel ↓</a>` : ''}
			</div><div id="d-out"></div></div>`;

		const out = root.querySelector('#d-out')!;
		root.querySelector('#d-validate')?.addEventListener('click', async () => {
			out.innerHTML = `<p class="muted">Validiere…</p>`;
			try {
				const v = await api.validate(inv.id);
				out.innerHTML =
					v.formatErrors.length + v.businessErrors.length === 0
						? `<p style="color:var(--ok)">Gültig: keine Fehler.</p>`
						: `<ul>${[...v.formatErrors, ...v.businessErrors].map(e => `<li class="error">${esc(e)}</li>`).join('')}</ul>`;
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
		root.querySelector('#d-issue')?.addEventListener('click', async () => {
			if (!window.confirm('Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).')) return;
			try {
				const issued = await api.issue(inv.id);
				location.hash = `#/invoices/${issued.id}`;
				location.reload();
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}
}
