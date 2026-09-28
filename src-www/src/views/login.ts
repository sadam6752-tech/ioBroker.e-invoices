import { esc, getToken, setToken } from '../api';

/** Login page: stores the API token (from the adapter instance settings). */
export function login(root: HTMLElement): void {
	const current = getToken();
	root.innerHTML = `<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${esc(current ?? '')}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${current ? `<button class="secondary" id="l-out">Abmelden</button>` : ''}</div>
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
