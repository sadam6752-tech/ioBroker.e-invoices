import './styles.css';
import { getToken } from './api';
import { initLanguage, t } from './i18n';
import { backup } from './views/backup';
import { company } from './views/company';
import { customers } from './views/customers';
import { dashboard } from './views/dashboard';
import { detail } from './views/detail';
import { invoiceTemplates } from './views/invoice-templates';
import { login, logout } from './views/login';
import { offers } from './views/offers';
import { openItems } from './views/open-items';
import { products } from './views/products';
import { status } from './views/status';
import { templates } from './views/templates';
import { wizard } from './views/wizard';

const app = document.querySelector('#app')!;

function shell(route: string): void {
	const logged = !!getToken();
	// The bar carries the tabs and nothing else: it grew with every feature. The
	// "+ Neu" buttons sit where their lists are (invoices, offers) and the app name
	// moved to the status page — `#/new` stays routable for those buttons.
	const links: [string, string][] = [
		['#/', t('Rechnungen')],
		['#/offers', t('Angebote')],
		['#/open-items', t('Offene Posten')],
		['#/templates', t('Druckvorlagen')],
		['#/company', t('Firma')],
		['#/customers', t('Kunden')],
		['#/products', t('Positionen')],
		['#/invoice-templates', t('Rechnungsvorlagen')],
		['#/backup', t('Backup')],
		['#/status', t('Status')],
		[logged ? '#/logout' : '#/login', logged ? t('Logout') : t('Login')],
	];
	app.innerHTML = `<header class="top"><nav>
		${links.map(([h, label]) => `<a href="${h}" class="${route === h || (h === '#/' && route.startsWith('#/invoices')) ? 'active' : ''}">${label}</a>`).join('')}
	</nav></header><main id="view"></main>`;
}

async function route(): Promise<void> {
	const hash = location.hash || '#/';
	shell(hash);
	const v = document.querySelector<HTMLElement>('#view')!;
	if (hash === '#/' || hash === '#') {
		await dashboard(v);
	} else if (hash === '#/offers') {
		await offers(v);
	} else if (hash === '#/open-items') {
		await openItems(v);
	} else if (hash === '#/new' || hash === '#/new/quote') {
		wizard(v, undefined, hash === '#/new/quote' ? 'quote' : 'invoice');
	} else if (hash.startsWith('#/edit/')) {
		wizard(v, decodeURIComponent(hash.slice('#/edit/'.length)));
	} else if (hash.startsWith('#/invoices/')) {
		await detail(v, decodeURIComponent(hash.slice('#/invoices/'.length)));
	} else if (hash === '#/templates') {
		await templates(v);
	} else if (hash === '#/company') {
		await company(v);
	} else if (hash === '#/customers') {
		await customers(v);
	} else if (hash === '#/products') {
		await products(v);
	} else if (hash === '#/invoice-templates') {
		await invoiceTemplates(v);
	} else if (hash === '#/backup') {
		await backup(v);
	} else if (hash === '#/login') {
		login(v);
	} else if (hash === '#/logout') {
		logout();
	} else if (hash === '#/status') {
		await status(v);
	} else {
		v.innerHTML = `<div class="card">${t('Unbekannte Route.')}</div>`;
	}
}

/**
 * Reads the start language the admin chose. The health route is open on purpose,
 * so the login page already speaks the right language before a token exists.
 */
async function adminLanguage(): Promise<string | null> {
	try {
		const res = await fetch('/api/health');
		if (!res.ok) {
			return null;
		}
		return ((await res.json()) as { pwaLanguage?: string }).pwaLanguage ?? null;
	} catch {
		return null;
	}
}

void adminLanguage().then(admin => {
	initLanguage(admin);
	window.addEventListener('hashchange', () => void route());
	void route();
});
