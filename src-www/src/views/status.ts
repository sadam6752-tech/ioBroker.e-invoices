import { api, esc } from '../api';
import { t } from '../i18n';

/**
 * Status page: adapter health and counters.
 *
 * It also carries the app name: the header bar stays for the tabs only, and the
 * version and the schema belong next to that name anyway.
 *
 * @param root - Element the page is rendered into.
 */
export async function status(root: HTMLElement): Promise<void> {
	try {
		const h = await api.health();
		root.innerHTML = `<div class="card"><h3>${t('Status')}</h3>
			<p><strong>E-Invoices</strong> - ${t('Version')}: ${esc(h.version)} · ${t('Schema')}: ${esc(String(h.schemaVersion))}</p>
			<pre class="dump">${esc(JSON.stringify(h.counts, null, 2))}</pre></div>`;
	} catch (e) {
		root.innerHTML = `<div class="card error">${t('API nicht erreichbar')}: ${esc((e as Error).message)}</div>`;
	}
}
