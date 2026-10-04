/**
 * Light / dark theme of the web app.
 *
 * The user chooses `system` (follow the device, the default), `light` or `dark` on the status
 * page. The choice belongs to this device (localStorage), like the language. The result is one
 * attribute on `<html>`: `data-theme="light"` or `"dark"`, which the style sheet turns into
 * colors. `public/theme-init.js` does the same thing before the first paint so the page does not
 * flash light first; both use the same storage key. Documents (PDF, Excel) are not affected.
 */

/** What the user can choose. */
export type ThemeChoice = 'system' | 'light' | 'dark';

/** The theme that is applied in the end. */
export type Theme = 'light' | 'dark';

/** localStorage key of the choice on this device (`public/theme-init.js` reads the same one). */
export const THEME_KEY = 'e-invoices.theme';

/** Colors of the browser bar (`<meta name="theme-color">`) per theme: the header color of the app. */
export const THEME_COLORS: Record<Theme, string> = { light: '#1a56db', dark: '#2563eb' };

/**
 * Reads a stored or typed value as a choice; anything unknown means `system`.
 *
 * @param raw - Value from storage.
 */
export function toChoice(raw: unknown): ThemeChoice {
	return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/**
 * The theme that follows from a choice.
 *
 * @param choice - What the user chose.
 * @param systemDark - True when the device prefers a dark appearance.
 */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): Theme {
	if (choice === 'system') {
		return systemDark ? 'dark' : 'light';
	}
	return choice;
}

/** True when the device asks for a dark appearance (false where it cannot be asked). */
function systemPrefersDark(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia('(prefers-color-scheme: dark)').matches
		: false;
}

/** The choice stored on this device; `system` without one or without storage. */
export function getThemeChoice(): ThemeChoice {
	try {
		return toChoice(localStorage.getItem(THEME_KEY));
	} catch {
		return 'system';
	}
}

/**
 * Puts a theme on the page.
 *
 * @param theme - Light or dark.
 */
function paint(theme: Theme): void {
	document.documentElement.setAttribute('data-theme', theme);
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/**
 * Applies a choice to the page and remembers it on this device.
 *
 * @param choice - What the user chose.
 * @param remember - Store the choice (false when only the stored one is applied at the start).
 */
export function setThemeChoice(choice: ThemeChoice, remember = true): void {
	if (remember) {
		try {
			if (choice === 'system') {
				localStorage.removeItem(THEME_KEY);
			} else {
				localStorage.setItem(THEME_KEY, choice);
			}
		} catch {
			// storage blocked: the choice still applies for this page view
		}
	}
	paint(resolveTheme(choice, systemPrefersDark()));
}

/**
 * Applies the stored choice at the start and follows the device while the choice is `system`
 * (a phone that switches to dark in the evening).
 */
export function initTheme(): void {
	setThemeChoice(getThemeChoice(), false);
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (getThemeChoice() === 'system') {
				setThemeChoice('system', false);
			}
		});
	}
}
