/**
 * 0.9.5: light / dark theme of the web app. The rule that turns a choice into a theme, the early
 * script that must agree with it, and the style sheet that must define every color for both themes.
 */
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const source = readFileSync(resolve('src-www/src/theme.ts'), 'utf8');
const output = ts.transpileModule(source, {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} as Record<string, unknown> };
new Function('module', 'exports', output)(mod, mod.exports);
const { resolveTheme, toChoice, THEME_KEY, THEME_COLORS } = mod.exports as {
	resolveTheme: (choice: string, systemDark: boolean) => string;
	toChoice: (raw: unknown) => string;
	THEME_KEY: string;
	THEME_COLORS: Record<string, string>;
};

describe('pwa => theme (0.9.5)', () => {
	it('follows the device on "system" and obeys an explicit choice', () => {
		expect(resolveTheme('system', true)).to.equal('dark');
		expect(resolveTheme('system', false)).to.equal('light');
		expect(resolveTheme('dark', false)).to.equal('dark');
		expect(resolveTheme('light', true)).to.equal('light');
	});

	it('treats everything unknown as "system"', () => {
		expect(toChoice('dark')).to.equal('dark');
		expect(toChoice('light')).to.equal('light');
		for (const raw of ['system', '', null, undefined, 'blau', 1, {}]) {
			expect(toChoice(raw), JSON.stringify(raw) ?? 'undefined').to.equal('system');
		}
	});

	it('uses the same storage key and the same bar colors in the early script', () => {
		const init = readFileSync(resolve('src-www/public/theme-init.js'), 'utf8');
		expect(init).to.contain(`'${THEME_KEY}'`);
		expect(init).to.contain(THEME_COLORS.dark);
		expect(init).to.contain(THEME_COLORS.light);
		// the bar color of the page itself is the light one
		expect(readFileSync(resolve('src-www/index.html'), 'utf8')).to.contain(`content="${THEME_COLORS.light}"`);
		// and the early script is loaded before the app, from the app's own origin (the CSP allows no inline script)
		const html = readFileSync(resolve('src-www/index.html'), 'utf8');
		expect(html.indexOf('theme-init.js')).to.be.greaterThan(-1);
		expect(html.indexOf('theme-init.js')).to.be.lessThan(html.indexOf('/src/main.ts'));
	});

	it('defines every color variable of the light theme for the dark theme as well', () => {
		const css = readFileSync(resolve('src-www/src/styles.css'), 'utf8').replace(/\r\n/g, '\n');
		const light = /:root \{([^}]*)\}/.exec(css)![1];
		const dark = /:root\[data-theme='dark'\] \{([^}]*)\}/.exec(css)![1];
		const names = (block: string): string[] => [...block.matchAll(/(--[\w-]+):/g)].map(match => match[1]);
		const lightNames = names(light).filter(name => name !== '--radius');
		const darkNames = names(dark);
		for (const name of lightNames) {
			expect(darkNames, `${name} has no dark value`).to.include(name);
		}
		// every variable the rules use exists
		for (const used of new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map(match => match[1]))) {
			expect(names(light), `${used} is used but not defined`).to.include(used);
		}
	});

	it('keeps colors out of the rules: only the variables and a few fixed ones carry hex values', () => {
		const css = readFileSync(resolve('src-www/src/styles.css'), 'utf8').replace(/\r\n/g, '\n');
		const rules = css.slice(css.indexOf('--badge-off-fg: #d1d5db;\n}') + 25);
		const hex = [...rules.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map(match => match[0]);
		// white on the brand color, the always-dark code box and the dark-theme link color
		expect(new Set(hex)).to.deep.equal(new Set(['#fff', '#111827', '#e5e7eb', '#93c5fd']));
	});
});
