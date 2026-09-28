/**
 * P4c tests: Pflichtfeld-Wächter and template persistence.
 */
import { expect } from 'chai';
import { InvoiceDatabase } from './db';
import { DEFAULT_TEMPLATE, validateTemplate, type LayoutTemplate } from './templates';

function valid(): LayoutTemplate {
	return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as LayoutTemplate;
}

describe('templates => validateTemplate', () => {
	it('accepts the default template', () => {
		expect(validateTemplate(valid())).to.deep.equal([]);
	});

	it('blocks hidden Pflicht blocks', () => {
		for (const block of ['title', 'meta', 'parties', 'positions', 'totals'] as const) {
			const candidate = valid();
			candidate.blocks[block] = false;
			const errors = validateTemplate(candidate);
			expect(errors.join(' '), block).to.contain(block);
		}
	});

	it('allows toggling payment and notes', () => {
		const candidate = valid();
		candidate.blocks.payment = false;
		candidate.blocks.notes = false;
		expect(validateTemplate(candidate)).to.deep.equal([]);
	});

	it('rejects bad colors, names and logos', () => {
		const badColor = valid();
		badColor.colors.primary = 'blue';
		expect(validateTemplate(badColor).length).to.be.greaterThan(0);

		const badName = valid();
		badName.name = '   ';
		expect(validateTemplate(badName).length).to.be.greaterThan(0);

		const badLogo = valid();
		badLogo.logo = { path: '', position: 'top' as never, widthMm: 200 };
		expect(validateTemplate(badLogo).length).to.be.greaterThan(0);

		expect(validateTemplate(null)).to.have.lengthOf(1);
	});
});

describe('templates => database', () => {
	it('seeds, versions, switches and protects templates', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			const seeded = db.ensureDefaultTemplate();
			expect(seeded.isDefault).to.equal(true);
			expect(seeded.name).to.equal('Standard');
			expect(db.ensureDefaultTemplate().id).to.equal(seeded.id);

			const second = db.createTemplate('Blau', { ...valid(), name: 'Blau' });
			expect(second.version).to.equal(1);
			expect(second.isDefault).to.equal(false);

			const updated = db.updateTemplate(second.id, { definition: { ...second.definition, footerText: 'Danke' } });
			expect(updated.version).to.equal(2);
			expect(updated.definition.footerText).to.equal('Danke');

			const switched = db.setDefaultTemplate(second.id);
			expect(switched.isDefault).to.equal(true);
			expect(db.getTemplate(seeded.id)?.isDefault).to.equal(false);

			expect(() => db.deleteTemplate(second.id)).to.throw(/default/i);
			db.deleteTemplate(seeded.id);
			expect(db.getTemplate(seeded.id)).to.equal(null);
			expect(() =>
				db.createTemplate('Bad', { ...valid(), blocks: { ...valid().blocks, totals: false } }),
			).to.throw(/Invalid template/);
		} finally {
			db.close();
		}
	});

	it('refuses to delete templates referenced by invoices', () => {
		const db = new InvoiceDatabase(':memory:');
		db.migrate();
		try {
			db.ensureDefaultTemplate();
			const other = db.createTemplate('Zweit', { ...valid(), name: 'Zweit' });
			const created = db.createDraft({
				seller: { name: 'S', street: 'a', zip: '1', city: 'B', country: 'DE', vatId: 'DE1' },
				buyer: { name: 'K', street: 'a', zip: '1', city: 'B', country: 'DE' },
				lines: [{ description: 'X', quantity: 1, unit: 'Stk', unitPriceNet: 10, vatRate: 19 }],
				issueDate: '2026-09-28',
				deliveryDate: '2026-09-28',
				currency: 'EUR',
			});
			const issued = db.issueDraft(created.id, 2026);
			db.attachIssueArtifacts(issued.id, { xml: '<x/>', pdfPath: 'p.pdf', templateId: other.id });
			expect(() => db.deleteTemplate(other.id)).to.throw(/referenced/i);
		} finally {
			db.close();
		}
	});
});
