import './styles.css';
import { getToken } from './api';
import { initLanguage, t } from './i18n';
import { initTheme } from './theme';
import { customers } from './views/customers';
import { dashboard } from './views/dashboard';
import { detail } from './views/detail';
import { invoiceTemplates } from './views/invoice-templates';
import { login, logout } from './views/login';
import { offers } from './views/offers';
import { dunning } from './views/dunning';
import { openItems } from './views/open-items';
import { revenue } from './views/revenue';
import { products } from './views/products';
import { system } from './views/system';
import { templates } from './views/templates';
import { wizard } from './views/wizard';

const app = document.querySelector('#app')!;

/** The three addresses of the system page (backup and company used to be tabs of their own). */
const SYSTEM_ROUTES = ['#/status', '#/backup', '#/company'];

function shell(route: string): void {
	const logged = !!getToken();
	// The bar carries the tabs and nothing else: it grew with every feature. The
	// "+ Neu" buttons sit where their lists are (invoices, offers) and the app name
	// moved to the status page — `#/new` stays routable for those buttons.
	const links: [string, string][] = [
		['#/', t('Rechnungen')],
		['#/offers', t('Angebote')],
		['#/open-items', t('Offene Posten')],
		['#/dunning', t('Mahnwesen')],
		['#/revenue', t('Umsatz')],
		['#/templates', t('Druckvorlagen')],
		['#/customers', t('Kunden')],
		['#/products', t('Positionen')],
		['#/invoice-templates', t('Rechnungsvorlagen')],
		['#/status', t('System')],
		[logged ? '#/logout' : '#/login', logged ? t('Logout') : t('Login')],
	];
	app.innerHTML = `<header class="top"><nav>
		${links.map(([h, label]) => `<a href="${h}" class="${route === h || (h === '#/' && route.startsWith('#/invoices')) || (h === '#/status' && SYSTEM_ROUTES.includes(route)) ? 'active' : ''}">${label}</a>`).join('')}
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
	} else if (hash === '#/dunning') {
		await dunning(v);
	} else if (hash === '#/revenue') {
		await revenue(v);
	} else if (hash === '#/new' || hash === '#/new/quote') {
		wizard(v, undefined, hash === '#/new/quote' ? 'quote' : 'invoice');
	} else if (hash.startsWith('#/edit/')) {
		wizard(v, decodeURIComponent(hash.slice('#/edit/'.length)));
	} else if (hash.startsWith('#/invoices/')) {
		await detail(v, decodeURIComponent(hash.slice('#/invoices/'.length)));
	} else if (hash === '#/templates') {
		await templates(v);
	} else if (hash === '#/customers') {
		await customers(v);
	} else if (hash === '#/products') {
		await products(v);
	} else if (hash === '#/invoice-templates') {
		await invoiceTemplates(v);
	} else if (hash === '#/login') {
		login(v);
	} else if (hash === '#/logout') {
		logout();
	} else if (SYSTEM_ROUTES.includes(hash)) {
		await system(v, hash === '#/backup' ? 'backup' : hash === '#/company' ? 'company' : 'status');
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

// the stored light/dark choice (the page already has it from theme-init.js, this keeps it in step with the device)
initTheme();

void adminLanguage().then(admin => {
	initLanguage(admin);
	window.addEventListener('hashchange', () => void route());
	void route();
});
