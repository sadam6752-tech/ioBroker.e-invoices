import { api, esc, type CompanyProfile, type Party } from '../api';

const emptyParty = (): Party => ({ name: '', street: '', zip: '', city: '', country: 'DE' });

function field(obj: Party, key: keyof Party, label: string): string {
	const value = obj[key];
	const text = Array.isArray(value) ? value.join('\n') : (value ?? '');
	return `<label>${label}<input data-f="${key}" value="${esc(text)}" /></label>`;
}

/**
 * Company page: seller master data, used as wizard default.
 *
 * @param root
 */
export async function company(root: HTMLElement): Promise<void> {
	root.innerHTML = `<div class="card">Lade Firmendaten…</div>`;
	let current: CompanyProfile | null = null;
	let message = '';
	let isError = false;

	try {
		current = await api.company.getDefault();
		if (!current) {
			const list = await api.company.list();
			current = list[0] ?? null;
		}
	} catch (e) {
		root.innerHTML = `<div class="card error">${esc((e as Error).message)}</div>`;
		return;
	}

	function render(): void {
		const p = current?.profile ?? emptyParty();
		root.innerHTML = `<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${esc(current?.name ?? 'Meine Firma')}" /></label>
			${field(p, 'name', 'Firmenname')}
			${field(p, 'street', 'Straße')}
			<div class="grid2">${field(p, 'zip', 'PLZ')}${field(p, 'city', 'Ort')}</div>
			<div class="grid2">${field(p, 'country', 'Land')}${field(p, 'email', 'E-Mail')}</div>
			<div class="grid2">${field(p, 'phone', 'Telefon')}${field(p, 'website', 'Webseite')}</div>
			<div class="grid2">${field(p, 'vatId', 'USt-IdNr.')}${field(p, 'taxNumber', 'Steuernummer')}</div>
			<div class="grid2">${field(p, 'bankName', 'Bankname')}${field(p, 'iban', 'IBAN')}</div>
			<label>BIC<input data-f="bic" value="${esc(p.bic ?? '')}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0, 1, 2, 3]
				.map(
					i => `<div class="grid2"><label>Box ${i + 1}<textarea data-fbox="${i}" rows="3">${esc((p.footerBoxes ?? [])[i] ?? '')}</textarea></label>
				<label>Ausrichtung<select data-falign="${i}">
					${(['left', 'center', 'right'] as const)
						.map(
							v =>
								`<option value="${v}" ${(p.footerAlign ?? [])[i] === v || (!(p.footerAlign ?? [])[i] && v === 'left') ? 'selected' : ''}>${v === 'left' ? 'Links' : v === 'center' ? 'Zentriert' : 'Rechts'}</option>`,
						)
						.join('')}
				</select></label></div>`,
				)
				.join('')}
			${message ? `<p class="${isError ? 'error' : ''}">${esc(message)}</p>` : ''}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`;

		root.querySelector('#c-save')?.addEventListener('click', async () => {
			const profile: Party = { ...emptyParty() };
			root.querySelectorAll<HTMLInputElement>('input[data-f]').forEach(el => {
				(profile as unknown as Record<string, string>)[el.dataset.f!] = el.value;
			});
			const boxes: string[] = [0, 1, 2, 3].map(
				i => root.querySelector<HTMLTextAreaElement>(`textarea[data-fbox="${i}"]`)?.value ?? '',
			);
			if (boxes.some(box => box.trim() !== '')) {
				profile.footerBoxes = boxes;
				profile.footerAlign = [0, 1, 2, 3].map(i => {
					const v = root.querySelector<HTMLSelectElement>(`select[data-falign="${i}"]`)?.value;
					return v === 'center' || v === 'right' ? v : 'left';
				});
			} else {
				delete profile.footerBoxes;
				delete profile.footerAlign;
			}
			const name = root.querySelector<HTMLInputElement>('#c-name')?.value.trim() || 'Meine Firma';
			try {
				if (current) {
					current = await api.company.update(current.id, { name, profile });
				} else {
					current = await api.company.create(name, profile);
				}
				message = 'Gespeichert.';
				isError = false;
				render();
			} catch (e) {
				message = (e as Error).message;
				isError = true;
				render();
			}
		});
	}

	render();
}
