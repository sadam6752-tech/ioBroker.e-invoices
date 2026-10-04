import { backup } from './backup';
import { company } from './company';
import { appendThemeCard, status } from './status';

/** The parts of the system page; each one also answers to its former address. */
export type SystemSection = 'status' | 'backup' | 'company';

/**
 * System page: what is rarely needed in one place — the status of the adapter, backup and restore, the
 * company data (filled in once) and the look of the app. It replaces the tabs "Backup", "Firma" and "Status";
 * `#/backup` and `#/company` still work and scroll to their part, so old bookmarks and links keep their meaning.
 *
 * @param root - Element the page is rendered into.
 * @param section - Part to scroll to.
 */
export async function system(root: HTMLElement, section: SystemSection = 'status'): Promise<void> {
	root.innerHTML = `<section id="sys-status"></section><section id="sys-backup"></section><section id="sys-company"></section><section id="sys-theme"></section>`;
	const part = (id: string): HTMLElement => root.querySelector<HTMLElement>(`#sys-${id}`)!;
	await Promise.all([status(part('status')), backup(part('backup')), company(part('company'))]);
	appendThemeCard(part('theme'));
	if (section !== 'status') {
		part(section).scrollIntoView();
	}
}
