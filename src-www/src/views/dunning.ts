import { api, downloadUrl, esc, eur, type DunningSuggestion, type DunningText } from '../api';
import { t } from '../i18n';

/**
 * Words for a dunning level in the language in use.
 *
 * @param level - 1 to 3.
 */
export function levelLabel(level: number): string {
	if (level === 1) {
		return t('Zahlungserinnerung');
	}
	return level === 2 ? t('1. Mahnung') : t('2. Mahnung');
}

/**
 * Dunning (R6.4): the next step per overdue invoice with the text filled in, the three
 * level texts to edit, and the letters as one PDF or a CSV. The adapter sends nothing —
 * the user sends the letter (copy, mail link, PDF) and then marks the invoice as reminded,
 * which is what moves it to the next level.
 *
 * @param root - Element the page is rendered into.
 */
export async function dunning(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Mahnwesen…')}</div>`;

	/**
	 * Draws the page.
	 *
	 * @param suggestions - Next steps.
	 * @param texts - The three levels.
	 */
	function render(suggestions: DunningSuggestion[], texts: DunningText[]): void {
		root.innerHTML = `
		<div class="card">
			<div class="row"><strong>${t('Mahnwesen')}</strong></div>
			<div class="row actions">
				<button class="btn secondary" id="dn-pdf" ${suggestions.length === 0 ? 'disabled' : ''} title="${t('Alle Schreiben in einer PDF, eine Seite je Rechnung')}">PDF</button>
				<button class="btn secondary" id="dn-csv" ${suggestions.length === 0 ? 'disabled' : ''}>CSV</button>
			</div>
			<p class="muted">${t('Der nächste Schritt je überfälliger Rechnung. Der Adapter versendet nichts: Schreiben kopieren, mailen oder drucken und danach „Als gemahnt markieren“ — erst das setzt die Stufe weiter. Es entsteht kein XML.')}</p>
		</div>
		<div id="dn-err"></div>
		<div class="card">
			${
				suggestions.length === 0
					? `<p class="muted">${t('Keine Mahnvorschläge.')}</p>`
					: suggestions
							.map(
								item => `<div class="card" data-invoice="${esc(item.invoiceId)}">
						<div class="row"><strong>${esc(item.number)}</strong> ${esc(item.customer)}
							<span class="muted">${levelLabel(item.level)} · ${t('{days} Tage überfällig', { days: item.overdueDays })} · ${eur(item.amount)} · ${t('Zahlungsziel')} ${esc(item.deadline)}</span></div>
						<details><summary>${esc(item.subject)}</summary><pre class="dn-text">${esc(item.text)}</pre></details>
						<div class="row actions">
							<button class="btn secondary" data-copy="${esc(item.invoiceId)}">${t('Text kopieren')}</button>
							${
								item.email
									? `<a class="btn secondary" href="mailto:${esc(item.email)}?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.text)}">${t('E-Mail')}</a>`
									: `<span class="muted">${t('keine E-Mail-Adresse')}</span>`
							}
							<button class="btn" data-mark="${esc(item.invoiceId)}">${t('Als gemahnt markieren')}</button>
							<a href="#/invoices/${esc(item.invoiceId)}">${t('Ansehen')}</a>
						</div>
					</div>`,
							)
							.join('')
			}
		</div>
		<div class="card">
			<h3>${t('Texte der Stufen')}</h3>
			<p class="muted">${t('Platzhalter: {number} {customer} {issueDate} {dueDate} {amount} {days} {deadline} {seller}. „Ab Tag“ ist die Zahl der Tage nach Fälligkeit, ab der die Stufe vorgeschlagen wird; sie muss von Stufe zu Stufe wachsen. Gebühren und Verzugszinsen sind absichtlich nicht vorbelegt.')}</p>
			${texts
				.map(
					text => `<div class="card" data-level="${text.level}">
				<strong>${levelLabel(text.level)}</strong>${text.isDefault ? ` <span class="muted">(${t('Standardtext')})</span>` : ''}
				<label>${t('Betreff')}<input class="dn-subject" value="${esc(text.subject)}" /></label>
				<label>${t('Text')}<textarea class="dn-body" rows="8">${esc(text.body)}</textarea></label>
				<div class="row">
					<label>${t('Ab Tag')}<input class="dn-days" type="number" min="1" max="365" value="${text.days}" /></label>
					<label>${t('Zahlungsziel (Tage)')}<input class="dn-deadline" type="number" min="1" max="90" value="${text.deadlineDays}" /></label>
				</div>
				<div class="row actions">
					<button class="btn" data-save="${text.level}">${t('Speichern')}</button>
					<button class="btn secondary" data-reset="${text.level}" ${text.isDefault ? 'disabled' : ''}>${t('Standardtext wiederherstellen')}</button>
				</div>
			</div>`,
				)
				.join('')}
		</div>`;

		const fail = (e: unknown): void => {
			const box = root.querySelector('#dn-err');
			if (box) {
				box.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
			}
		};
		root.querySelector('#dn-pdf')?.addEventListener('click', async () => {
			try {
				await downloadUrl(api.dunning.pdfUrl(), 'mahnungen.pdf');
			} catch (e) {
				fail(e);
			}
		});
		root.querySelector('#dn-csv')?.addEventListener('click', async () => {
			try {
				await downloadUrl(api.dunning.csvUrl(), 'mahnvorschlaege.csv');
			} catch (e) {
				fail(e);
			}
		});
		for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
			button.addEventListener('click', async () => {
				const item = suggestions.find(entry => entry.invoiceId === button.dataset.copy);
				try {
					await navigator.clipboard.writeText(`${item?.subject ?? ''}\n\n${item?.text ?? ''}`);
					button.textContent = t('Kopiert');
				} catch (e) {
					fail(e);
				}
			});
		}
		for (const button of root.querySelectorAll<HTMLButtonElement>('[data-mark]')) {
			button.addEventListener('click', async () => {
				try {
					await api.reminded(button.dataset.mark ?? '');
					await load();
				} catch (e) {
					fail(e);
				}
			});
		}
		for (const button of root.querySelectorAll<HTMLButtonElement>('[data-save]')) {
			button.addEventListener('click', async () => {
				const card = button.closest('[data-level]')!;
				try {
					await api.dunning.saveText(Number(button.dataset.save), {
						subject: card.querySelector<HTMLInputElement>('.dn-subject')!.value,
						body: card.querySelector<HTMLTextAreaElement>('.dn-body')!.value,
						days: Number(card.querySelector<HTMLInputElement>('.dn-days')!.value),
						deadlineDays: Number(card.querySelector<HTMLInputElement>('.dn-deadline')!.value),
					});
					await load();
				} catch (e) {
					fail(e);
				}
			});
		}
		for (const button of root.querySelectorAll<HTMLButtonElement>('[data-reset]')) {
			button.addEventListener('click', async () => {
				try {
					await api.dunning.resetText(Number(button.dataset.reset));
					await load();
				} catch (e) {
					fail(e);
				}
			});
		}
	}

	/** Loads suggestions and texts and draws the page. */
	async function load(): Promise<void> {
		try {
			const [suggestions, texts] = await Promise.all([api.dunning.suggestions(), api.dunning.texts()]);
			render(suggestions, texts);
		} catch (e) {
			root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		}
	}

	await load();
}
