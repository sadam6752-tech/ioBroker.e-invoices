import { api, downloadUrl, esc, eur, openUrl } from '../api';
import { t } from '../i18n';
import { isQuote, labels, quoteState, quoteStateLabel, statusLabel } from '../labels';
import { mountAttachments } from './attachments';

/**
 * Rounds to cents without the float trap of a bare Math.round.
 *
 * @param value
 */
function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats `2026-10-01` or `2026-10-01..2026-10-31` for display.
 *
 * @param value
 */
function deliveryDe(value: string): string {
	const raw = (value ?? '').trim();
	const [start, end] = raw.split('..');
	const de = (iso: string): string =>
		/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')
			? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
			: (iso ?? '');
	return end ? `${de(start)} – ${de(end)}` : de(start);
}

/**
 * Invoice detail: fields, validation, downloads, issue action.
 *
 * @param root
 * @param id
 */
export async function detail(root: HTMLElement, id: string): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade…')}</div>`;
	try {
		const loaded = await api.get(id);
		let inv = loaded;
		// R8: the words follow the document type, never the free display title,
		// and the state of an offer is derived the way the server derives it.
		const lbl = labels(inv.docType);
		const quote = isQuote(inv.docType);
		const state = quoteState(inv);
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
				<strong>${esc(inv.number ?? t('(Entwurf)'))}</strong>
				${
					quote
						? `<span class="badge ${state}">${esc(quoteStateLabel(state))}</span>`
						: `<span class="badge ${inv.status}">${statusLabel(inv.status)}</span>`
				}
				<span class="muted">${esc(lbl.one)}</span>
				<a class="btn secondary" href="${quote ? '#/offers' : '#/'}">← ${quote ? t('Angebote') : t('Liste')}</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>${t('Verkäufer')}</strong><br />${esc(inv.seller.name)}<br />${esc(inv.seller.street)}<br />${esc(inv.seller.zip)} ${esc(inv.seller.city)}</div>
				<div><strong>${t('Käufer')}</strong><br />${esc(inv.buyer.name)}<br />${esc(inv.buyer.street)}<br />${esc(inv.buyer.zip)} ${esc(inv.buyer.city)}${inv.buyer.email ? `<br />${esc(inv.buyer.email)}` : ''}</div>
			</div>
			<p>${esc(lbl.date.replace(/:$/, ''))}: ${esc(inv.issueDate)} · ${esc(
				lbl.delivery.replace(/:$/, ''),
			)}: ${esc(deliveryDe(inv.deliveryDate))}${inv.dueDate ? ` · ${t('Fällig')}: ${esc(inv.dueDate)}` : ''}${
				quote && inv.validUntil ? ` · ${esc(lbl.validUntil.replace(/:$/, ''))}: ${esc(inv.validUntil)}` : ''
			}</p>
			${quote && inv.acceptedAt ? `<p style="color:var(--ok)">${t('Angenommen am {date}.', { date: esc(inv.acceptedAt.slice(0, 10)) })}</p>` : ''}
			${
				quote && inv.rejectedAt
					? `<p class="error">${t('Abgelehnt am {date}', { date: esc(inv.rejectedAt.slice(0, 10)) })}${
							inv.rejectionReason ? `: ${esc(inv.rejectionReason)}` : ''
						}.</p>`
					: ''
			}
			${quote && state === 'expired' ? `<p class="muted">${t('Das Angebot ist am {date} verfallen.', { date: esc(inv.validUntil ?? '') })}</p>` : ''}
			<table class="lines"><tr>
				<th>#</th><th>${t('Bezeichnung')}</th><th class="r">${t('Menge')}</th><th class="r">${t('Preis netto')}</th>
				${hasDiscount ? `<th class="r">${t('Rabatt')}</th><th class="r">${t('Rabatt €')}</th>` : ''}
				<th class="r">${t('USt')}</th><th class="r">${t('Netto')}</th>
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
			<p><strong>${t('Gesamt')}: ${eur(inv.totals.grossTotal)}</strong> <span class="muted">(${t('netto')} ${eur(inv.totals.netTotal)} + ${t('USt')} ${eur(inv.totals.taxTotal)})</span></p>
			${inv.notes ? `<p class="muted">${t('Notiz')}: ${esc(inv.notes)}</p>` : ''}
			</div>
			<div class="card"><div class="row">
				${inv.status === 'draft' ? `<a class="btn" href="#/edit/${esc(inv.id)}">${t('Bearbeiten')}</a>` : ''}
				${inv.status === 'draft' ? `<button id="d-issue">${esc(lbl.issue)}</button><span class="muted">${t('Danach nicht mehr änderbar.')}</span>` : ''}
				${!quote && inv.status === 'issued' ? `<label class="pay"><input type="checkbox" id="d-paid" ${inv.paid ? 'checked' : ''} /><span>${t('bezahlt')}${inv.paid && inv.paidAt ? ` (${esc(inv.paidAt.slice(0, 10))})` : ''}</span></label>` : ''}
				${!quote && inv.status === 'issued' ? `<button class="secondary" id="d-storno">${t('Storno')}</button>` : ''}
				${
					inv.status === 'issued'
						? inv.sentAt
							? `<span class="badge issued" title="${esc(
									inv.sendChannel ?? 'E-Mail',
								)} ${t('am')} ${esc(inv.sentAt.slice(0, 10))}">${t('versendet')}</span>`
							: `<button class="secondary" id="d-sent" title="${t('Als versendet markieren')}">${t('Als versendet markieren')}</button>`
						: ''
				}
				${inv.status !== 'draft' && inv.pdfPath ? `<button class="secondary" id="d-rerender" title="${t('Erzeugt die PDF aus den gespeicherten Daten neu (z. B. nach einer Layout-Korrektur). Nummer, Beträge und Daten bleiben unverändert, das Original wird archiviert.')}">${t('Neu rendern')}</button>` : ''}
				${!quote ? `<button class="secondary" id="d-as-tpl" title="${t('Legt eine Rechnungsvorlage mit diesen Positionen, Terminen und Zahlungsbedingungen an. Käufer und Datum werden nicht übernommen.')}">${t('Vorlage erstellen')}</button>` : ''}
				<button class="secondary" id="d-validate">${quote ? t('Pflichtangaben prüfen') : t('Validieren')}</button>
				${quote && inv.status === 'issued' && !inv.acceptedAt && !inv.rejectedAt ? `<button id="d-accept">${t('Annehmen')}</button><button class="secondary" id="d-reject">${t('Ablehnen')}</button>` : ''}
				${quote && inv.status === 'issued' ? `<button class="secondary" id="d-convert" title="${t('Erstellt einen Rechnungsentwurf mit Verweis auf dieses Angebot. Die Rechnungsnummer fällt erst beim Ausstellen.')}">${t('In Rechnung umwandeln')}</button>` : ''}
			${inv.pdfPath ? `<button class="secondary" data-view="pdf">${t('PDF ansehen')}</button>` : ''}
			${inv.pdfPath ? `<button class="secondary" data-dl="pdf">PDF ↓</button>` : ''}
			${inv.status === 'issued' && inv.pdfPath ? `<button class="secondary" id="d-mail">${t('E-Mail (PDF)')}</button>` : ''}
			${inv.xml ? `<button class="secondary" data-dl="xml">XML ↓</button>` : ''}
			${inv.xlsxPath ? `<button class="secondary" data-dl="xlsx">Excel ↓</button>` : ''}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div><div id="d-reports"></div><div id="d-attachments"></div><div id="d-links"></div></div>`;

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
				historyBox.innerHTML = `<details><summary>${t('Neu gerendert ({n})', { n: entries.length })}</summary><ul>${entries
					.map(
						e =>
							`<li>${esc(e.createdAt.slice(0, 16).replace('T', ' '))} – ${esc(
								e.artifact.toUpperCase(),
							)}${e.reason ? ` – ${esc(e.reason)}` : ''}${
								e.previousPath
									? ` – ${t('Original')}: <code>${esc(e.previousPath.split('/').pop() ?? '')}</code>`
									: ''
							}</li>`,
					)
					.join('')}</ul></details>`;
			} catch {
				// history is informational, never block the view
			}
		};
		await loadHistory();
		// R2: reports of earlier validation runs, so a check stays reproducible.
		const reportsBox = root.querySelector('#d-reports')!;
		const loadReports = async (): Promise<void> => {
			try {
				const reports = await api.validationReports(inv.id);
				if (!reports.length) {
					reportsBox.innerHTML = '';
					return;
				}
				reportsBox.innerHTML = `<details><summary>${t('Validierungsberichte ({n})', { n: reports.length })}</summary><ul>${reports
					.map(
						r =>
							`<li>${esc(r.createdAt.slice(0, 16).replace('T', ' '))} – ${t('Bericht {n}', { n: r.seq })}: ${
								r.formatErrors + r.businessErrors === 0
									? `<span style="color:var(--ok)">${t('keine Fehler')}</span>`
									: t('{format} Format-, {business} Fachfehler', {
											format: r.formatErrors,
											business: r.businessErrors,
										})
							} – <a href="#" data-report="${r.seq}">${t('herunterladen')}</a></li>`,
					)
					.join('')}</ul></details>`;
				reportsBox.querySelectorAll('[data-report]').forEach(link =>
					link.addEventListener('click', async event => {
						event.preventDefault();
						const seq = Number((link as HTMLElement).dataset.report);
						try {
							await downloadUrl(api.validationReportUrl(inv.id, seq), `validation-${seq}.json`);
						} catch (e) {
							fail(e);
						}
					}),
				);
			} catch {
				// reports are informational, never block the view
			}
		};
		await loadReports();
		// R4: Anlagen — hochladen/löschen nur beim Entwurf, ausgestellte
		// Rechnungen zeigen die Dateien nur noch an (GoBD).
		mountAttachments(root.querySelector('#d-attachments')!, inv.id, { readOnly: inv.status !== 'draft' });
		// R8: the chain offer → invoice stays visible from both sides. The offer
		// lists the invoices it became, the invoice names its offer.
		const linksBox = root.querySelector('#d-links')!;
		const loadLinks = async (): Promise<void> => {
			const parts: string[] = [];
			try {
				if (inv.sourceDocumentId) {
					const source = await api.get(inv.sourceDocumentId);
					parts.push(
						`<p>${t('Zugrunde liegendes Angebot')}: <a href="#/invoices/${esc(source.id)}">${esc(
							source.number ?? t('(Entwurf)'),
						)}</a>${source.validUntil ? ` (${t('gültig bis {date}', { date: esc(source.validUntil) })})` : ''}${
							source.acceptedAt
								? ` – ${t('angenommen am {date}', { date: esc(source.acceptedAt.slice(0, 10)) })}`
								: ''
						}</p>`,
					);
				}
				if (quote) {
					const derived = await api.list({ docType: 'invoice', sourceDocumentId: inv.id });
					if (derived.length > 0) {
						parts.push(
							`<p>${t('Daraus hervorgegangene Rechnung(en)')}: ${derived
								.map(d => `<a href="#/invoices/${esc(d.id)}">${esc(d.number ?? t('(Entwurf)'))}</a>`)
								.join(', ')}</p>`,
						);
					}
				}
				linksBox.innerHTML = parts.length ? `<div class="card">${parts.join('')}</div>` : '';
			} catch {
				// the relationship panel is informational, never block the view
			}
		};
		await loadLinks();
		root.querySelectorAll('[data-dl]').forEach(btn =>
			btn.addEventListener('click', async () => {
				const kind = (btn as HTMLElement).dataset.dl as 'pdf' | 'xml' | 'xlsx';
				const url =
					kind === 'pdf' ? api.pdfUrl(inv.id) : kind === 'xml' ? api.xmlUrl(inv.id) : api.xlsxUrl(inv.id);
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
			out.innerHTML = `<p class="muted">${t('Validiere…')}</p>`;
			try {
				const v = await api.validate(inv.id);
				const report = v.report;
				const findings = [...v.formatErrors, ...v.businessErrors];
				const stored = report
					? `<p class="muted">${t('Bericht gespeichert')}: <code>${esc(
							report.path.split('/').pop() ?? '',
						)}</code> – <a href="#" id="d-report-last">${t('herunterladen')}</a></p>`
					: `<p class="muted">${t('Hinweis: der Bericht konnte nicht gespeichert werden (Adapter-Log).')}</p>`;
				out.innerHTML =
					(findings.length === 0
						? `<p style="color:var(--ok)">${quote ? t('Gültig: keine offenen Pflichtangaben.') : t('Gültig: keine Fehler.')}</p>`
						: `<ul>${findings.map(e => `<li class="error">${esc(e)}</li>`).join('')}</ul>`) +
					(quote
						? `<p class="muted">${t('Ein Angebot ist keine E-Rechnung: geprüft werden nur die Pflichtangaben — es gibt kein XML und keine XSD-Prüfung.')}</p>`
						: '') +
					stored;
				if (report) {
					out.querySelector('#d-report-last')?.addEventListener('click', async event => {
						event.preventDefault();
						try {
							await downloadUrl(
								api.validationReportUrl(inv.id, report.seq),
								`validation-${report.seq}.json`,
							);
						} catch (e) {
							fail(e);
						}
					});
				}
				await loadReports();
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
				out.innerHTML = `<p style="color:var(--ok)">${want ? t('Als bezahlt markiert.') : t('Zahlung zurückgenommen.')}</p>`;
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
				`${quote && inv.validUntil ? `Das Angebot ist bis ${inv.validUntil} gültig.\n` : ''}` +
				`${!quote && inv.dueDate ? `Bitte überweisen bis ${inv.dueDate}.\n` : ''}\n` +
				`Mit freundlichen Grüßen\n${inv.seller.name}\n`;
			try {
				await downloadUrl(api.pdfUrl(inv.id), `${inv.number ?? 'rechnung'}.pdf`);
			} catch (e) {
				fail(e);
				return;
			}
			const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
			// set to empty when the customer has no address: the mail program then
			// asks for the recipient instead of failing silently
			window.location.href = href;
			out.innerHTML = to
				? `<p class="muted">${t('PDF wurde gespeichert. Die Mail wurde an {to} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.', { to: esc(to) })}</p>`
				: `<p class="muted">${t('PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.')}</p>`;
		});
		root.querySelector('#d-sent')?.addEventListener('click', async () => {
			try {
				inv = await api.markSent(inv.id, 'E-Mail');
				out.innerHTML = `<p style="color:var(--ok)">${t('Als versendet markiert')}${inv.sentAt ? ` (${esc(inv.sentAt.slice(0, 10))})` : ''}.</p>`;
				root.querySelector('#d-sent')?.remove();
			} catch (e) {
				fail(e);
			}
		});
		root.querySelector('#d-as-tpl')?.addEventListener('click', async () => {
			const suggested = `${inv.buyer.name || 'Rechnung'} ${new Date().getFullYear()}`;
			const name = window.prompt(t('Name der Vorlage:'), suggested);
			if (!name || !name.trim()) {
				return;
			}
			try {
				const tpl = await api.asTemplate(inv.id, name.trim());
				out.innerHTML = `<p style="color:var(--ok)">${t('Vorlage „{name}" angelegt –', { name: esc(tpl.name) })}
					<a href="#/invoice-templates">${t('jetzt bearbeiten')}</a>.</p>`;
			} catch (e) {
				fail(e);
			}
		});
		root.querySelector('#d-rerender')?.addEventListener('click', async () => {
			const reason = window.prompt(
				t('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):'),
				'Layout-Korrektur',
			);
			if (reason === null) {
				return;
			}
			if (
				!window.confirm(
					t(
						'Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-<n>.pdf archiviert (nie überschrieben), das XML bleibt unverändert. Fortfahren?',
					),
				)
			) {
				return;
			}
			out.innerHTML = `<p class="muted">${t('Rendere neu…')}</p>`;
			try {
				const res = await api.rerender(inv.id, reason.trim() || undefined);
				inv = res.invoice;
				out.innerHTML = `<p style="color:var(--ok)">${t('PDF neu erzeugt.')}${
					res.archivedPath
						? ` ${t('Das Original liegt als {name} daneben.', { name: `<code>${esc(res.archivedPath.split('/').pop() ?? '')}</code>` })}`
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
						<button class="secondary" id="d-duty-ok">${t('Zahlungsweise geprüft')}</button>`;
							root.querySelector('#d-duty-ok')?.addEventListener('click', async () => {
								try {
									await api.paymentCheck(inv.id, 'geprüft');
									dutyBox.innerHTML = `<p style="color:var(--ok)">${t('Zahlungsweise geprüft.')}</p>`;
								} catch (e) {
									fail(e);
								}
							});
						} else if (checked) {
							dutyBox.innerHTML = `<p class="muted">${t('Zahlungsweise geprüft')}${
								inv.paymentCheckedAt ? ` ${t('am')} ${esc(inv.paymentCheckedAt.slice(0, 10))}` : ''
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
			const reason = window.prompt(
				t('Grund für den Storno (erscheint auf der Gutschrift):'),
				'Falsch ausgestellt',
			);
			if (reason === null) {
				return;
			}
			if (
				!window.confirm(
					t(
						'Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?',
					),
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
			if (!window.confirm(lbl.issueConfirm)) {
				return;
			}
			try {
				const issued = await api.issue(inv.id);
				location.hash = `#/invoices/${issued.id}`;
				location.reload();
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
		// R8: the two answers of the customer. The first one counts — the second
		// is refused by the server, so the buttons disappear afterwards.
		root.querySelector('#d-accept')?.addEventListener('click', async () => {
			if (
				!window.confirm(
					t(
						'Angebot als angenommen vermerken? Die Entscheidung ist endgültig und steht danach auf dem Angebot.',
					),
				)
			) {
				return;
			}
			try {
				await api.quoteAccept(inv.id);
				location.reload();
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
		root.querySelector('#d-reject')?.addEventListener('click', async () => {
			const reason = window.prompt(t('Grund der Ablehnung (erscheint auf dem Angebot):'), '');
			if (reason === null) {
				return;
			}
			if (!window.confirm(t('Angebot als abgelehnt vermerken? Die Entscheidung ist endgültig.'))) {
				return;
			}
			try {
				await api.quoteReject(inv.id, reason.trim() || undefined);
				location.reload();
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
		// R8: the conversion creates an invoice *draft*; the number and the PDF
		// follow when that draft is issued, so nothing is booked by accident.
		root.querySelector('#d-convert')?.addEventListener('click', async () => {
			const accepted = !!inv.acceptedAt;
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
				const draft = await api.convert(inv.id, accepted);
				out.innerHTML =
					`<p style="color:var(--ok)">${t('Rechnungsentwurf erstellt – Nummer und PDF folgen beim Ausstellen:')} ` +
					`<a href="#/edit/${esc(draft.id)}">${t('Entwurf öffnen')}</a></p>`;
				// the offer itself stays the page's subject: the panel then lists
				// the invoice that came out of it
				await loadLinks();
			} catch (e) {
				out.innerHTML = `<p class="error">${esc((e as Error).message)}</p>`;
			}
		});
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
	}
}
