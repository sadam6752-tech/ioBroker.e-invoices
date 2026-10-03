import { api, downloadUrl, esc, eur, type RevenueReport } from '../api';
import { t } from '../i18n';

/**
 * Revenue per company (R6.3): the issued invoices added up per company profile, for
 * one year or for all of them, as a list, CSV and Excel. The numbers come from the
 * server (`/api/reports/revenue-by-company`), the page adds nothing up on its own.
 *
 * @param root - Element the page is rendered into.
 */
export async function revenue(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Umsatz…')}</div>`;
	let year: number | undefined = new Date().getFullYear();

	/**
	 * Draws the page for a report.
	 *
	 * @param report - Result of the server.
	 */
	function render(report: RevenueReport): void {
		root.innerHTML = `
		<div class="card">
			<div class="row"><strong>${t('Umsatz je Firma')}</strong></div>
			<div class="row filters">
				<label>${t('Jahr')}<input type="number" id="rv-year" min="1990" max="2200" step="1" value="${year ?? ''}" placeholder="${t('alle')}" /></label>
			</div>
			<div class="row actions">
				<button class="btn secondary" id="rv-xlsx" title="${t('Excel-Liste')}">Excel</button>
				<button class="btn secondary" id="rv-csv" title="${t('CSV für die Buchhaltung')}">CSV</button>
			</div>
			<p class="muted">${t('Ausgestellte Rechnungen je Firma. Angebote, Entwürfe, Stornos und Gutschriften zählen nicht; eine stornierte Rechnung fällt heraus. Rechnungen von vor der Firmenzuordnung stehen in einer eigenen Zeile. Die Rechnungsnummer läuft für alle Firmen gemeinsam.')}</p>
		</div>
		<div id="rv-err"></div>
		<div class="card">
			${
				report.rows.length === 0
					? `<p class="muted">${t('Keine Rechnungen im Zeitraum.')}</p>`
					: `<table class="ovw sums"><thead><tr>
						<th>${t('Firma')}</th><th class="r">${t('Anzahl')}</th><th class="r">${t('Netto')}</th><th class="r">${t('USt')}</th><th class="r">${t('Brutto')}</th>
					</tr></thead><tbody>
						${report.rows
							.map(
								row => `<tr data-company="${esc(row.companyId ?? 'none')}"><td class="lbl">${row.companyId == null ? t('ohne Firmenzuordnung') : esc(row.company)}</td>
									<td class="r">${row.count}</td><td class="r">${eur(row.net)}</td><td class="r">${eur(row.tax)}</td><td class="r">${eur(row.gross)}</td></tr>`,
							)
							.join('')}
						<tr class="sum total" id="rv-total"><td class="lbl">${t('Gesamt')}</td><td class="r">${report.total.count}</td>
							<td class="r">${eur(report.total.net)}</td><td class="r">${eur(report.total.tax)}</td><td class="r">${eur(report.total.gross)}</td></tr>
					</tbody></table>`
			}
		</div>`;

		root.querySelector('#rv-year')?.addEventListener('change', event => {
			const value = (event.target as HTMLInputElement).value.trim();
			year = value ? Number(value) : undefined;
			void load();
		});
		const fail = (e: unknown): void => {
			const box = root.querySelector('#rv-err');
			if (box) {
				box.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
			}
		};
		root.querySelector('#rv-xlsx')?.addEventListener('click', async () => {
			try {
				await downloadUrl(api.revenueXlsxUrl(year), 'umsatz-je-firma.xlsx');
			} catch (e) {
				fail(e);
			}
		});
		root.querySelector('#rv-csv')?.addEventListener('click', async () => {
			try {
				await downloadUrl(api.revenueCsvUrl(year), 'umsatz-je-firma.csv');
			} catch (e) {
				fail(e);
			}
		});
	}

	/** Loads the report for the current year and draws it. */
	async function load(): Promise<void> {
		try {
			render(await api.revenue(year));
		} catch (e) {
			root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		}
	}

	await load();
}
