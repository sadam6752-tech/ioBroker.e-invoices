import { t } from '../i18n';
import { backup } from './backup';
import { company } from './company';
import { appendThemeCard, status } from './status';
import { templates } from './templates';

/** The tabs of the system page; each one has the address the tab of its own used to have. */
export type SystemSection = 'status' | 'backup' | 'company' | 'templates';

/**
 * System page: what is rarely needed, behind a row of tabs inside the page — *Status* (with the
 * appearance of the app), *Backup*, *Firma* and *Druckvorlagen*. Only the chosen tab is loaded and shown,
 * so the page stays short. The tabs are the old addresses (`#/status`, `#/backup`, `#/company`,
 * `#/templates`), which keeps old bookmarks and links working.
 *
 * @param root - Element the page is rendered into.
 * @param section - Tab to show.
 */
export async function system(root: HTMLElement, section: SystemSection = 'status'): Promise<void> {
	const tabs: [SystemSection, string][] = [
		['status', t('Status')],
		['backup', t('Backup')],
		['company', t('Firma')],
		['templates', t('Druckvorlagen')],
	];
	root.innerHTML = `<nav class="subtabs">${tabs
		.map(([id, label]) => `<a href="#/${id}" class="${id === section ? 'active' : ''}">${label}</a>`)
		.join(
			'',
		)}</nav><section id="sys-${section}"></section>${section === 'status' ? '<section id="sys-theme"></section>' : ''}`;
	const part = (id: string): HTMLElement => root.querySelector<HTMLElement>(`#sys-${id}`)!;
	if (section === 'status') {
		await status(part('status'));
		appendThemeCard(part('theme'));
	} else if (section === 'backup') {
		await backup(part('backup'));
	} else if (section === 'company') {
		await company(part('company'));
	} else {
		await templates(part('templates'));
	}
}
