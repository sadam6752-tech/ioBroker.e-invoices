import { api, esc } from '../api';

/** Status page: adapter health and counters. */
export async function status(root: HTMLElement): Promise<void> {
	try {
		const h = await api.health();
		root.innerHTML = `<div class="card"><h3>Status</h3>
			<p>Version: ${esc(h.version)} · Schema: ${esc(String(h.schemaVersion))}</p>
			<pre class="dump">${esc(JSON.stringify(h.counts, null, 2))}</pre></div>`;
	} catch (e) {
		root.innerHTML = `<div class="card error">API nicht erreichbar: ${esc((e as Error).message)}</div>`;
	}
}
