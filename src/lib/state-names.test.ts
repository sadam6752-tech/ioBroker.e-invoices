/**
 * The objects of the adapter carry names in the eleven ioBroker languages, the buttons act on `true` only
 * (points of the ioBroker review checklist).
 */
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { BUTTON_STATES, isButtonPress } from './control-buttons';
import { STATE_NAMES } from './state-names';

const LANGUAGES = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

describe('objects => names in eleven languages', () => {
	it('has all eleven languages, none of them empty', () => {
		for (const [id, names] of Object.entries(STATE_NAMES)) {
			expect(Object.keys(names).sort(), id).to.deep.equal([...LANGUAGES].sort());
			for (const language of LANGUAGES) {
				expect(names[language].trim(), `${id} ${language}`).to.not.equal('');
			}
		}
	});

	it('names every state main.ts creates, and io-package.json carries the same names', () => {
		const main = readFileSync('src/main.ts', 'utf8');
		const created = [...main.matchAll(/id: '((?:info|control)\.[A-Za-z]+)'/g)].map(match => match[1]);
		expect(created.length).to.be.greaterThan(15);
		for (const id of created) {
			expect(STATE_NAMES, id).to.have.property(id);
		}
		const ioPackage = JSON.parse(readFileSync('io-package.json', 'utf8')) as {
			instanceObjects: { _id: string; common: { name: unknown } }[];
		};
		for (const object of ioPackage.instanceObjects) {
			expect(object.common.name, object._id).to.deep.equal(STATE_NAMES[object._id]);
		}
	});
});

describe('control => a button acts on true only', () => {
	const ns = 'e-invoices.0';

	it('reacts to a press from outside and to nothing else', () => {
		expect(isButtonPress(ns, `${ns}.control.issue`, { ack: false, val: true })).to.equal(true);
		// the value false, any other value, an acknowledged write and a deleted state start nothing
		for (const val of [false, 0, 1, 'true', null, undefined]) {
			expect(isButtonPress(ns, `${ns}.control.issue`, { ack: false, val }), String(val)).to.equal(false);
		}
		expect(isButtonPress(ns, `${ns}.control.issue`, { ack: true, val: true })).to.equal(false);
		expect(isButtonPress(ns, `${ns}.control.issue`, null)).to.equal(false);
	});

	it('ignores inputs and foreign states', () => {
		expect(isButtonPress(ns, `${ns}.control.issueId`, { ack: false, val: true })).to.equal(false);
		expect(isButtonPress(ns, `${ns}.control.restoreId`, { ack: false, val: true })).to.equal(false);
		expect(isButtonPress(ns, `${ns}.info.lastNumber`, { ack: false, val: true })).to.equal(false);
		expect(isButtonPress(ns, 'other.0.control.issue', { ack: false, val: true })).to.equal(false);
		expect([...BUTTON_STATES].sort()).to.deep.equal(['backup', 'createDraft', 'issue', 'refresh', 'restore']);
	});
});
