import { api, esc } from '../api';
import { t } from '../i18n';
import { getThemeChoice, setThemeChoice, toChoice } from '../theme';

/**
 * The look of the app: light, dark or follow the device. A choice of this device, no server call.
 *
 * @param root - Element the card is added to.
 */
export function appendThemeCard(root: HTMLElement): void {
	const choice = getThemeChoice();
	root.insertAdjacentHTML(
		'beforeend',
		`<div class="card"><h3>${t('Darstellung')}</h3>
		<label>${t('Farbschema')}<select id="s-theme">
			<option value="system" ${choice === 'system' ? 'selected' : ''}>${t('System')}</option>
			<option value="light" ${choice === 'light' ? 'selected' : ''}>${t('Hell')}</option>
			<option value="dark" ${choice === 'dark' ? 'selected' : ''}>${t('Dunkel')}</option>
		</select></label>
		<p class="muted">${t('„System“ folgt der Einstellung deines Geräts. Die Wahl gilt nur für dieses Gerät; PDF und Excel bleiben unverändert.')}</p></div>`,
	);
	root.querySelector<HTMLSelectElement>('#s-theme')?.addEventListener('change', event => {
		setThemeChoice(toChoice((event.target as HTMLSelectElement).value));
	});
}

/**
 * Status section of the system page: adapter health and counters.
 *
 * It also carries the app name: the header bar stays for the tabs only, and the
 * version and the schema belong next to that name anyway.
 *
 * @param root - Element the page is rendered into.
 */
export async function status(root: HTMLElement): Promise<void> {
	try {
		const [h, { counts }] = await Promise.all([api.health(), api.statusCounts()]);
		root.innerHTML = `<div class="card"><h3>${t('Status')}</h3>
			<p><strong>E-Invoices</strong> - ${t('Version')}: ${esc(h.version)} · ${t('Schema')}: ${esc(String(h.schemaVersion))}</p>
			<pre class="dump">${esc(JSON.stringify(counts, null, 2))}</pre>
			<p class="muted" id="s-disclaimer">${t('Haftungsausschluss: Das Programm wird unentgeltlich und ohne Gewähr bereitgestellt und ersetzt keine Steuer- oder Rechtsberatung. Für die Richtigkeit der Rechnungen, die Einhaltung der Vorschriften und die Datensicherung bist du selbst verantwortlich. Details im README.')}</p></div>`;
	} catch (e) {
		root.innerHTML = `<div class="card error">${t('API nicht erreichbar')}: ${esc((e as Error).message)}</div>`;
	}
}
