import { esc, getToken, setToken } from '../api';
import { t } from '../i18n';

/**
 * Login page: stores the API token (from the adapter instance settings).
 *
 * @param root - Element the page is rendered into.
 */
export function login(root: HTMLElement): void {
	const current = getToken();
	root.innerHTML = `<div class="card"><h3>${t('Anmeldung')}</h3>
		<p class="muted">${t('Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).')}
		${t('Ohne Token vertraut die API dem lokalen Netzwerk.')}</p>
		<label>${t('API-Token')}<input id="l-token" type="password" value="${esc(current ?? '')}" /></label>
		<div class="row"><button id="l-save">${t('Speichern')}</button>
		${current ? `<button class="secondary" id="l-out">${t('Abmelden')}</button>` : ''}</div>
		<div id="l-out-msg"></div>
	</div>`;
	root.querySelector('#l-save')?.addEventListener('click', () => {
		const value = root.querySelector<HTMLInputElement>('#l-token')?.value.trim() ?? '';
		setToken(value || null);
		location.hash = '#/';
	});
	root.querySelector('#l-out')?.addEventListener('click', () => {
		setToken(null);
		location.hash = '#/login';
		location.reload();
	});
}

/** Logout route handler. */
export function logout(): void {
	setToken(null);
	location.hash = '#/login';
}
