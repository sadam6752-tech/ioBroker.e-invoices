/**
 * 0.9.3: the quick choices of the date range in the web app. Everything is calendar arithmetic
 * on the day itself; no time zone may shift a boundary.
 */
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const output = ts.transpileModule(readFileSync(resolve('src-www/src/range.ts'), 'utf8'), {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} as Record<string, unknown> };
new Function('module', 'exports', output)(mod, mod.exports);
const { presetRange, localToday } = mod.exports as {
	presetRange: (preset: string, today: string) => { from: string; to: string };
	localToday: (now?: Date) => string;
};

describe('pwa => date range quick choices (0.9.3)', () => {
	it('knows month, quarter and year, this one and the last one', () => {
		const today = '2026-09-15';
		expect(presetRange('thisMonth', today)).to.deep.equal({ from: '2026-09-01', to: '2026-09-30' });
		expect(presetRange('lastMonth', today)).to.deep.equal({ from: '2026-08-01', to: '2026-08-31' });
		expect(presetRange('thisQuarter', today)).to.deep.equal({ from: '2026-07-01', to: '2026-09-30' });
		expect(presetRange('lastQuarter', today)).to.deep.equal({ from: '2026-04-01', to: '2026-06-30' });
		expect(presetRange('thisYear', today)).to.deep.equal({ from: '2026-01-01', to: '2026-12-31' });
		expect(presetRange('lastYear', today)).to.deep.equal({ from: '2025-01-01', to: '2025-12-31' });
	});

	it('reaches into the year before in January and knows leap years', () => {
		expect(presetRange('lastMonth', '2026-01-10')).to.deep.equal({ from: '2025-12-01', to: '2025-12-31' });
		expect(presetRange('lastQuarter', '2026-02-01')).to.deep.equal({ from: '2025-10-01', to: '2025-12-31' });
		expect(presetRange('thisMonth', '2028-02-29')).to.deep.equal({ from: '2028-02-01', to: '2028-02-29' });
		expect(presetRange('lastMonth', '2026-03-31')).to.deep.equal({ from: '2026-02-01', to: '2026-02-28' });
		// the last day of a quarter is part of that quarter
		expect(presetRange('thisQuarter', '2026-12-31')).to.deep.equal({ from: '2026-10-01', to: '2026-12-31' });
	});

	it('reads today from the local calendar', () => {
		expect(localToday(new Date(2026, 7, 1, 0, 30))).to.equal('2026-08-01');
		expect(localToday(new Date(2026, 11, 31, 23, 59))).to.equal('2026-12-31');
	});
});
