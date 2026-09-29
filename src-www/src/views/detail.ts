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
		const loaded = await api.get(id);
		let inv = loaded;
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
				<div><strong>Käufer</strong><br />${esc(inv.buyer.name)}<br />${esc(inv.buyer.street)}<br />${esc(inv.buyer.zip)} ${esc(inv.buyer.city)}${inv.buyer.email ? `<br />${esc(inv.buyer.email)}` : ''}</div>
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
				${inv.status === 'issued' ? `<label class="pay"><input type="checkbox" id="d-paid" ${inv.paid ? 'checked' : ''} /><span>bezahlt${inv.paid && inv.paidAt ? ` (${esc(inv.paidAt.slice(0, 10))})` : ''}</span></label>` : ''}
				${inv.status === 'issued' ? `<button class="secondary" id="d-storno">Storno</button>` : ''}
				${
					inv.status === 'issued'
						? inv.sentAt
							? `<span class="badge issued" title="${esc(
									inv.sendChannel ?? 'E-Mail',
								)} am ${esc(inv.sentAt.slice(0, 10))}">versendet</span>`
							: `<button class="secondary" id="d-sent" title="Als versendet markieren">Als versendet markieren</button>`
						: ''
				}
				${inv.status !== 'draft' && inv.pdfPath ? `<button class="secondary" id="d-rerender" title="Erzeugt die PDF neu, z. B. nach einer Layout-Korrektur. Der Inhalt der Rechnung bleibt unverändert, das Original wird archiviert.">Neu rendern</button>` : ''}
				<button class="secondary" id="d-validate">Validieren</button>
			${inv.pdfPath ? `<button class="secondary" data-view="pdf">PDF ansehen</button>` : ''}
			${inv.pdfPath ? `<button class="secondary" data-dl="pdf">PDF ↓</button>` : ''}
			${inv.status === 'issued' && inv.pdfPath ? `<button class="secondary" id="d-mail">E-Mail (PDF)</button>` : ''}
			${inv.xml ? `<button class="secondary" data-dl="xml">XML ↓</button>` : ''}
			${inv.xlsxPath ? `<button class="secondary" data-dl="xlsx">Excel ↓</button>` : ''}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div></div>`;

		const out = root.querySelector('#d-out')!;
		const fail = (e: unknown): void => {
			out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
		};
		// Render history: shows that a document was re-rendered and where the
		// originally delivered file was kept.
		const historyBox = root.querySelector('#d-history')!;
		const loadHistory = async (): Promise<void> => {
			if (inv.status === 'draft') {
				return;
			}
			try {
				const entries = await api.renders(inv.id);
				if (!entries.length) {
					historyBox.innerHTML = '';
					return;
				}
				historyBox.innerHTML = `<details><summary>Neu gerendert (${entries.length})</summary><ul>${entries
					.map(
						e =>
							`<li>${esc(e.createdAt.slice(0, 16).replace('T', ' '))} – ${esc(
								e.artifact.toUpperCase(),
							)}${e.reason ? ` – ${esc(e.reason)}` : ''}${
								e.previousPath
									? ` – Original: <code>${esc(e.previousPath.split('/').pop() ?? '')}</code>`
									: ''
							}</li>`,
					)
					.join('')}</ul></details>`;
			} catch {
				// history is informational, never block the view
			}
		};
		await loadHistory();
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
		root.querySelector('#d-paid')?.addEventListener('change', async event => {
			const box = event.target as HTMLInputElement;
			const want = box.checked;
			box.disabled = true;
			try {
				inv = await api.setPaid(inv.id, want);
				out.innerHTML = `<p style="color:var(--ok)">${want ? 'Als bezahlt markiert.' : 'Zahlung zurückgenommen.'}</p>`;
			} catch (e) {
				box.checked = !want;
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			} finally {
				box.disabled = false;
			}
		});
		root.querySelector('#d-mail')?.addEventListener('click', async () => {
			// A mailto: link cannot carry an attachment, so the PDF is saved to the
			// download folder first and the user drags it into the mail window.
			const to = (inv.buyer.email ?? '').trim();
			const subject = `${inv.documentTitle ?? 'Rechnung'} ${inv.number ?? ''}`.trim();
			const body =
				`Guten Tag ${inv.buyer.name || ''},\n\n` +
				`anbei erhalten Sie ${subject} vom ${inv.issueDate}.\n` +
				`Gesamtbetrag: ${eur(inv.totals.grossTotal)}.\n` +
				`${inv.dueDate ? `Bitte überweisen bis ${inv.dueDate}.\n` : ''}\n` +
				`Mit freundlichen Grüßen\n${inv.seller.name}\n`;
			try {
				await downloadUrl(api.pdfUrl(inv.id), `${inv.number ?? 'rechnung'}.pdf`);
			} catch (e) {
				fail(e);
				return;
			}
			const href =
				`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
			// set to empty when the customer has no address: the mail program then
			// asks for the recipient instead of failing silently
			window.location.href = href;
			out.innerHTML = to
				? `<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${esc(to)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`
				: `<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>`;
		});
		root.querySelector('#d-sent')?.addEventListener('click', async () => {
			try {
				inv = await api.markSent(inv.id, 'E-Mail');
				out.innerHTML = `<p style="color:var(--ok)">Als versendet markiert${inv.sentAt ? ` (${esc(inv.sentAt.slice(0, 10))})` : ''}.</p>`;
				root.querySelector('#d-sent')?.remove();
			} catch (e) {
				fail(e);
			}
		});
		root.querySelector('#d-rerender')?.addEventListener('click', async () => {
			const reason = window.prompt(
				'Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',
				'Layout-Korrektur',
			);
			if (reason === null) {
				return;
			}
			if (
				!window.confirm(
					'Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?',
				)
			) {
				return;
			}
			out.innerHTML = `<p class="muted">Rendere neu…</p>`;
			try {
				const res = await api.rerender(inv.id, reason.trim() || undefined);
				inv = res.invoice;
				out.innerHTML = `<p style="color:var(--ok)">PDF neu erzeugt.${
					res.archivedPath
						? ` Das Original liegt als <code>${esc(res.archivedPath.split('/').pop() ?? '')}</code> daneben.`
						: ''
				}</p>`;
		await loadHistory();

		// § 16 Abs. 2 Nr. 2 UStG: the server states whether the payment method
		// has to be checked. The decision itself stays with the user.
		const dutyBox = root.querySelector('#d-duty')!;
		if (inv.status !== 'draft' && !inv.paid) {
			try {
				const { duty, checked } = await api.paymentCheck(inv.id);
				if (duty.required && !checked) {
					dutyBox.innerHTML = `<p class="error">${esc(duty.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`;
					root.querySelector('#d-duty-ok')?.addEventListener('click', async () => {
						try {
							await api.paymentCheck(inv.id, 'geprüft');
							dutyBox.innerHTML = `<p style="color:var(--ok)">Zahlungsweise geprüft.</p>`;
						} catch (e) {
							fail(e);
						}
					});
				} else if (checked) {
					dutyBox.innerHTML = `<p class="muted">Zahlungsweise geprüft${
						inv.paymentCheckedAt ? ` am ${esc(inv.paymentCheckedAt.slice(0, 10))}` : ''
					}.</p>`;
				}
			} catch {
				// the duty hint is informational, never block the view
			}
		}
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
		root.querySelector('#d-storno')?.addEventListener('click', async () => {
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
				const { reversal } = await api.storno(inv.id, reason.trim() || undefined);
				location.hash = `#/edit/${reversal.id}`;
				location.reload();
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
