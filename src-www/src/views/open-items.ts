import { api, downloadUrl, esc, eur, type AgeBucket, type OpenItemsReport } from '../api';
import { t } from '../i18n';

/** Age buckets in the order the list shows them. */
const BUCKETS: AgeBucket[] = ['notDue', 'd1to30', 'd31to60', 'd61to90', 'over90'];

/**
 * Label of an age bucket in the language in use.
 *
 * @param bucket - Age bucket.
 */
export function bucketLabel(bucket: AgeBucket): string {
	switch (bucket) {
		case 'notDue':
			return t('nicht fällig');
		case 'd1to30':
			return t('1–30 Tage überfällig');
		case 'd31to60':
			return t('31–60 Tage überfällig');
		case 'd61to90':
			return t('61–90 Tage überfällig');
		default:
			return t('über 90 Tage überfällig');
	}
}

/**
 * Open items (OPOS, R6.2): the unpaid invoices with their age, the sums per age
 * bucket and per customer, and the same list as CSV and Excel. The numbers come
 * from the server (`/api/open-items`), the page adds nothing up on its own.
 *
 * @param root - Element the page is rendered into.
 */
export async function openItems(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">${t('Lade Offene Posten…')}</div>`;
	let onlyOverdue = false;
	let asOf = '';

	/** Query parameters of the current filter. */
	const params = (): { asOf?: string; onlyOverdue?: boolean } => ({
		asOf: asOf || undefined,
		onlyOverdue: onlyOverdue || undefined,
	});

	/**
	 * Draws the page for a report.
	 *
	 * @param report - Result of the server.
	 */
	function render(report: OpenItemsReport): void {
		root.innerHTML = `
		<div class="card">
			<div class="row"><strong>${t('Offene Posten')}</strong></div>
			<div class="row filters">
				<label class="pay"><input type="checkbox" id="op-overdue" ${onlyOverdue ? 'checked' : ''} /><span>${t('nur überfällige')}</span></label>
				<label>${t('Stichtag')}<input type="date" id="op-asof" value="${esc(report.asOf)}" /></label>
			</div>
			<div class="row actions">
				<button class="btn secondary" id="op-xlsx" title="${t('Excel-Liste')}">Excel</button>
				<button class="btn secondary" id="op-csv" title="${t('CSV für die Buchhaltung')}">CSV</button>
			</div>
			<p class="muted">${t('Unbezahlte, ausgestellte Rechnungen. Angebote, Entwürfe, Stornos und Gutschriften zählen nicht; Teilzahlungen gibt es nicht, der offene Betrag ist der Bruttobetrag.')}</p>
		</div>
		<div id="op-err"></div>
		<div class="card">
			<h3>${t('Alterung')}</h3>
			<table class="ovw sums">
				<thead><tr><th>${t('Alter')}</th><th class="r">${t('Anzahl')}</th><th class="r">${t('Betrag')}</th></tr></thead>
				<tbody>
					${BUCKETS.map(
						bucket => `<tr data-bucket="${bucket}"><td class="lbl">${bucketLabel(bucket)}</td>
							<td class="r">${report.buckets[bucket].count}</td><td class="r">${eur(report.buckets[bucket].amount)}</td></tr>`,
					).join('')}
					<tr class="sub" id="op-overdue-sum"><td class="lbl">${t('davon überfällig')}</td><td class="r">${report.overdue.count}</td><td class="r">${eur(report.overdue.amount)}</td></tr>
					<tr class="sum total" id="op-total"><td class="lbl">${t('Gesamt')}</td><td class="r">${report.total.count}</td><td class="r">${eur(report.total.amount)}</td></tr>
				</tbody>
			</table>
		</div>
		<div class="card">
			<h3>${t('Je Kunde')}</h3>
			${
				report.customers.length === 0
					? `<p class="muted">${t('Keine offenen Posten.')}</p>`
					: `<table class="ovw"><thead><tr><th>${t('Kunde')}</th><th class="r">${t('Anzahl')}</th><th class="r">${t('Betrag')}</th></tr></thead><tbody>
						${report.customers
							.map(
								c =>
									`<tr><td>${esc(c.customer)}${c.customerNumber ? ` <span class="muted">${esc(c.customerNumber)}</span>` : ''}</td><td class="r">${c.count}</td><td class="r">${eur(c.amount)}</td></tr>`,
							)
							.join('')}</tbody></table>`
			}
		</div>
		<div class="card">
			<h3>${t('Posten')}</h3>
			${
				report.items.length === 0
					? `<p class="muted">${t('Keine offenen Posten.')}</p>`
					: `<table class="ovw"><thead><tr>
						<th>${t('Nummer')}</th><th>${t('Kunde')}</th><th>${t('Fällig')}</th><th class="r">${t('Tage')}</th>
						<th>${t('Alter')}</th><th class="r">${t('Betrag')}</th><th class="r">${t('Mahnstufe')}</th><th></th>
					</tr></thead><tbody>
						${report.items
							.map(
								item => `<tr>
									<td><strong>${esc(item.number)}</strong></td><td>${esc(item.customer)}</td>
									<td>${esc(item.dueDate || '–')}</td><td class="r">${item.overdueDays > 0 ? item.overdueDays : '–'}</td>
									<td>${bucketLabel(item.bucket)}</td><td class="r">${eur(item.amount)}</td>
									<td class="r">${item.reminderLevel > 0 ? item.reminderLevel : '–'}</td>
									<td><a href="#/invoices/${esc(item.id)}">${t('Ansehen')}</a></td>
								</tr>`,
							)
							.join('')}</tbody></table>`
			}
		</div>`;

		root.querySelector('#op-overdue')?.addEventListener('change', event => {
			onlyOverdue = (event.target as HTMLInputElement).checked;
			void load();
		});
		root.querySelector('#op-asof')?.addEventListener('change', event => {
			asOf = (event.target as HTMLInputElement).value;
			void load();
		});
		const fail = (e: unknown): void => {
			const box = root.querySelector('#op-err');
			if (box) {
				box.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
			}
		};
		root.querySelector('#op-xlsx')?.addEventListener('click', async () => {
			try {
				await downloadUrl(api.openItemsXlsxUrl(params()), 'offene-posten.xlsx');
			} catch (e) {
				fail(e);
			}
		});
		root.querySelector('#op-csv')?.addEventListener('click', async () => {
			try {
				await downloadUrl(api.openItemsCsvUrl(params()), 'offene-posten.csv');
			} catch (e) {
				fail(e);
			}
		});
	}

	/** Loads the report for the current filter and draws it. */
	async function load(): Promise<void> {
		try {
			render(await api.openItems(params()));
		} catch (e) {
			root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		}
	}

	await load();
}
