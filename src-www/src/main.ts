import './styles.css';
import { backup } from './views/backup';
import { dashboard } from './views/dashboard';
import { detail } from './views/detail';
import { status } from './views/status';
import { templates } from './views/templates';
import { wizard } from './views/wizard';

const app = document.querySelector('#app')!;

function shell(route: string): void {
	const links: [string, string][] = [
		['#/', 'Rechnungen'],
		['#/new', '+ Neu'],
		['#/templates', 'Vorlagen'],
		['#/backup', 'Backup'],
		['#/status', 'Status'],
	];
	app.innerHTML = `<header class="top"><nav>
		<strong>E-Invoices</strong>
		${links.map(([h, t]) => `<a href="${h}" class="${route === h || (h === '#/' && route.startsWith('#/invoices')) ? 'active' : ''}">${t}</a>`).join('')}
	</nav></header><main id="view"></main>`;
}

async function route(): Promise<void> {
	const hash = location.hash || '#/';
	shell(hash);
	const v = document.querySelector<HTMLElement>('#view')!;
	if (hash === '#/' || hash === '#') {
		await dashboard(v);
	} else if (hash === '#/new') {
		wizard(v);
	} else if (hash.startsWith('#/invoices/')) {
		await detail(v, decodeURIComponent(hash.slice('#/invoices/'.length)));
	} else if (hash === '#/templates') {
		await templates(v);
	} else if (hash === '#/backup') {
		await backup(v);
	} else if (hash === '#/status') {
		await status(v);
	} else {
		v.innerHTML = `<div class="card">Unbekannte Route.</div>`;
	}
}

window.addEventListener('hashchange', () => void route());
void route();
