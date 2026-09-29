import { api, downloadUrl, esc, eur, openUrl } from '../api';

/** Rounds to cents without the float trap of a bare Math.round. */
function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formats `2026-10-01` or `2026-10-01..2026-10-31` for display. */
function deliveryDe(value: string): string {
	const raw = (value ?? '').trim();
	const [start, end] = raw.split('..');
	const de = (iso: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '') ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : (iso ?? ''));
	return end ? `${de(start)} – ${de(end)}` : de(start);
}

/** Invoice detail: fields, validation, downloads, issue action. */
export async function detail(root: HTMLElement, id: string): Promise<void> {
	root.innerHTML = `<div class="card">Lade…</div>`;
	try {
		const inv = await api.get(id);
		const lines = Array.isArray(inv.lines) ? inv.lines : [];
		const rows = lines.map(l => {
			const discount = Math.min(Math.max(Number(l.discountPercent) || 0, 0), 100);
			const quantity = Number(l.quantity) || 0;
			const price = Number(l.unitPriceNet) || 0;
			return {
				line: l,
				discount,
				gross: round2(quantity * price),
				net: round2(quantity * price * (1 - discount / 100)),
			};
		});
		const hasDiscount = rows.some(r => r.discount > 0);
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
			<p>Ausgestellt: ${esc(inv.issueDate)} · Leistung: ${esc(deliveryDe(inv.deliveryDate))}${inv.dueDate ? ` · Fällig: ${esc(inv.dueDate)}` : ''}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${hasDiscount ? '<th class="r">Rabatt</th><th class="r">Rabatt €</th>' : ''}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${rows
				.map(
					(r, i) => `<tr>
					<td>${i + 1}</td><td>${esc(r.line.description)}${r.line.sku ? ` (${esc(r.line.sku)})` : ''}</td>
					<td class="r">${esc(r.line.quantity)} ${esc(r.line.unit)}</td>
					<td class="r">${eur(Number(r.line.unitPriceNet))}</td>
					${hasDiscount ? `<td class="r">${r.discount > 0 ? `${esc(r.discount)} %` : '–'}</td><td class="r">${r.discount > 0 ? eur(round2(r.gross - r.net)) : '–'}</td>` : ''}
					<td class="r">${esc(r.line.vatRate)} %</td><td class="r"><strong>${eur(r.net)}</strong></td>
				</tr>`,
				)
				.join('')}
			</table>
			<p><strong>Gesamt: ${eur(inv.totals.grossTotal)}</strong> <span class="muted">(netto ${eur(inv.totals.netTotal)} + USt ${eur(inv.totals.taxTotal)})</span></p>
			${inv.notes ? `<p class="muted">Notiz: ${esc(inv.notes)}</p>` : ''}
			</div>
			<div class="card"><div class="row">
				${inv.status === 'draft' ? `<a class="btn" href="#/edit/${esc(inv.id)}">Bearbeiten</a>` : ''}
				${inv.status === 'draft' ? `<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>` : ''}
				<button class="secondary" id="d-validate">Validieren</button>
				${inv.pdfPath ? `<button class="secondary" data-view="pdf">PDF ansehen</button>` : ''}
				${inv.pdfPath ? `<button class="secondary" data-dl="pdf">PDF ↓</button>` : ''}
				${inv.xml ? `<button class="secondary" data-dl="xml">XML ↓</button>` : ''}
				${inv.xlsxPath ? `<button class="secondary" data-dl="xlsx">Excel ↓</button>` : ''}
			</div><div id="d-out"></div></div>`;

		const out = root.querySelector('#d-out')!;
		const fail = (e: unknown): void => {
			out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
		};
		root.querySelectorAll('[data-dl]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const kind = (btn as HTMLElement).dataset.dl as 'pdf' | 'xml' | 'xlsx';
				const url = kind === 'pdf' ? api.pdfUrl(inv.id) : kind === 'xml' ? api.xmlUrl(inv.id) : api.xlsxUrl(inv.id);
				try {
					await downloadUrl(url, `${inv.number ?? 'rechnung'}.${kind}`);
				} catch (e) {
					fail(e);
				}
			}),
		);
		root.querySelector('[data-view]')?.addEventListener('click', async () => {
			try {
				await openUrl(api.pdfUrl(inv.id));
			} catch (e) {
				fail(e);
			}
		});
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
