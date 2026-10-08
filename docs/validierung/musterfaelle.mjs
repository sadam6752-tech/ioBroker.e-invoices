/**
 * Creates the sample cases of the template preview data set over the real API and keeps
 * the CII XML and the hybrid PDF of every one of them, so external validators (KoSIT,
 * veraPDF) can be run over exactly those files.
 *
 * The script talks to a **running** server. The end-to-end server of `test/e2e` is the
 * easy way to get one, because it can be pointed at a throwaway data directory:
 *
 *   $env:E2E_PORT = '8099'; $env:E2E_DATA = 'C:\tmp\e2e-data'
 *   node test/e2e/server.mjs
 *   node docs/validierung/musterfaelle.mjs
 *
 * Environment:
 *   API_BASE   base URL of the server (default `http://127.0.0.1:8099`)
 *   E2E_TOKEN  bearer token the server expects (default `e2e-token-2026`)
 *
 * Usage:
 *   node docs/validierung/musterfaelle.mjs [target-directory]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.env.API_BASE ?? 'http://127.0.0.1:8099';
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';
const target = process.argv[2] ?? join(here, 'musterfaelle');

/** Parties every sample case shares. */
const seller = {
	name: 'Muster GmbH',
	street: 'Beispielstr. 1',
	zip: '10115',
	city: 'Berlin',
	country: 'DE',
	vatId: 'DE123456789',
	iban: 'DE02120300000000202051',
};
const buyer = {
	name: 'Musterkunde KG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-11',
};

/**
 * One JSON call against the server.
 *
 * @param method - HTTP method
 * @param path - path below the API base
 * @param body - optional JSON body
 */
async function json(method, path, body) {
	const response = await fetch(`${base}${path}`, {
		method,
		headers: {
			authorization: `Bearer ${token}`,
			...(body === undefined ? {} : { 'content-type': 'application/json' }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error(`${method} ${path} -> ${response.status} ${await response.text()}`);
	}
	return response.json();
}

/**
 * Downloads an artifact of an invoice.
 *
 * @param path - path below the API base
 */
async function bytes(path) {
	const response = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
	if (!response.ok) {
		throw new Error(`GET ${path} -> ${response.status} ${await response.text()}`);
	}
	return Buffer.from(await response.arrayBuffer());
}

/**
 * Creates a draft from the given body and issues it.
 *
 * @param body - draft fields on top of the fixed parties
 */
async function issue(body) {
	const draft = await json('POST', '/api/invoices', { seller, buyer, ...body });
	return json('POST', `/api/invoices/${draft.id}/issue`);
}

/**
 * Stores XML and PDF of an issued invoice and checks the markers that make the case.
 *
 * @param slug - file name without extension
 * @param invoice - invoice as the API reports it
 * @param markers - strings the CII XML has to contain
 * @param xrechnung - true for an XRechnung: the PDF is a plain view (no embedded XML, no PDF/A-3), so it is
 *   checked for that and not kept for the PDF/A validation
 */
async function save(slug, invoice, markers, xrechnung = false) {
	const xml = await bytes(`/api/invoices/${invoice.id}.xml`);
	const pdf = await bytes(`/api/invoices/${invoice.id}.pdf`);
	const text = xml.toString('utf8');
	const missing = markers.filter(marker => !text.includes(marker));
	if (missing.length) {
		throw new Error(`${slug}: XML ohne ${missing.join(', ')}`);
	}
	if (xrechnung && /EmbeddedFile|AFRelationship/.test(pdf.toString('latin1'))) {
		throw new Error(`${slug}: die PDF einer XRechnung darf kein XML enthalten`);
	}
	await writeFile(join(target, `${slug}.xml`), xml);
	if (!xrechnung) {
		await writeFile(join(target, `${slug}.pdf`), pdf);
	}
	const line = `${slug.padEnd(28)} ${String(invoice.number).padEnd(12)} brutto ${String(invoice.totals.grossTotal).padStart(9)} EUR   xml ${xml.length} B   pdf ${pdf.length} B`;
	console.log(`  ${line}`);
}

/** The sample cases: draft body plus the markers that prove the case in the XML. */
const cases = [
	{
		slug: 'vollrechnung-zwei-steuersaetze',
		body: {
			lines: [
				{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 },
				{
					description: 'Fachbuch',
					quantity: 1,
					unit: 'Stk',
					unitPriceNet: 50,
					discountPercent: 10,
					vatRate: 7,
				},
			],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
			documentTitle: 'Rechnung',
		},
		markers: [
			'<ram:TypeCode>380</ram:TypeCode>',
			'<ram:RateApplicablePercent>7</ram:RateApplicablePercent>',
			'AllowanceCharge',
		],
	},
	{
		slug: 'kleinbetrag-rundung',
		body: {
			lines: [{ description: 'Kleinbetrag Posten', quantity: 1, unit: 'Stk', unitPriceNet: 0.1, vatRate: 19 }],
			issueDate: '2026-09-28',
			documentTitle: 'Rechnung',
		},
		markers: ['<ram:GrandTotalAmount>0.12</ram:GrandTotalAmount>'],
	},
	{
		slug: 'gutschrift',
		body: {
			documentTitle: 'Gutschrift',
			notes: 'Gutschrift wegen Minderlieferung.',
			lines: [{ description: 'Gutschrift Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
		},
		markers: ['<ram:TypeCode>381</ram:TypeCode>', 'Gutschrift wegen Minderlieferung'],
	},
	{
		slug: 'reverse-charge-befreiung',
		// BR-AE-02 wants the buyer's VAT identifier (BT-48) next to the seller's one as soon
		// as a line carries the category "Reverse charge" — the first run of this case was
		// rejected by the KoSIT validator for exactly that reason.
		body: {
			buyer: { ...buyer, vatId: 'DE987654321' },
			lines: [
				{
					description: 'Montageleistung (Steuerschuldnerschaft des Leistungsempfängers)',
					quantity: 1,
					unit: 'Std',
					unitPriceNet: 500,
					vatRate: 0,
					exemptionCategory: 'AE',
					exemptionReason: 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
				},
			],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
			documentTitle: 'Rechnung',
		},
		markers: ['<ram:CategoryCode>AE</ram:CategoryCode>', '13b UStG', 'DE987654321'],
	},
];

await mkdir(target, { recursive: true });
let failed = 0;
for (const item of cases) {
	try {
		await save(item.slug, await issue(item.body), item.markers);
	} catch (error) {
		failed++;
		console.error(`  ${item.slug}: ${error.message}`);
	}
}

// The storno case is a two step one: issue an invoice, then reverse it and issue the
// reversal document — that reversal artifact is the one worth validating.
try {
	const original = await issue({
		lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 250, vatRate: 19 }],
		issueDate: '2026-09-28',
		documentTitle: 'Rechnung',
	});
	const reversal = await json('POST', `/api/invoices/${original.id}/storno`, { reason: 'Musterfall Storno' });
	const issued = await json('POST', `/api/invoices/${reversal.reversal.id}/issue`);
	await save('storno-zur-originalrechnung', issued, ['<ram:TypeCode>381</ram:TypeCode>', String(original.number)]);
} catch (error) {
	failed++;
	console.error(`  storno-zur-originalrechnung: ${error.message}`);
}

// With an attachment (R4): the file sits in the PDF/A-3 container and, for EN 16931, in the XML
// as BG-24 (AdditionalReferencedDocument with an embedded binary object).
try {
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
		'base64',
	);
	const draft = await json('POST', '/api/invoices', {
		seller,
		buyer,
		lines: [{ description: 'Leistung mit Nachweis', quantity: 1, unit: 'Std', unitPriceNet: 80, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		documentTitle: 'Rechnung',
	});
	await json('POST', `/api/invoices/${draft.id}/attachments`, {
		filename: 'leistungsnachweis.png',
		mime: 'image/png',
		dataBase64: png.toString('base64'),
	});
	const issued = await json('POST', `/api/invoices/${draft.id}/issue`);
	await save('rechnung-mit-anlage-bg24', issued, ['AdditionalReferencedDocument', 'AttachmentBinaryObject']);
} catch (error) {
	failed++;
	console.error(`  rechnung-mit-anlage-bg24: ${error.message}`);
}

// Skonto and payment terms: the discount shows up in the payment terms of the XML.
try {
	const issued = await issue({
		lines: [{ description: 'Leistung mit Skonto', quantity: 1, unit: 'Std', unitPriceNet: 200, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		dueDate: '2026-10-28',
		skontoPercent: 2,
		skontoDueDate: '2026-10-08',
		documentTitle: 'Rechnung',
	});
	await save('rechnung-mit-skonto', issued, ['SpecifiedTradePaymentTerms']);
} catch (error) {
	failed++;
	console.error(`  rechnung-mit-skonto: ${error.message}`);
}

// XRechnung (B2G, R6.1): the XML alone with the Leitweg-ID as buyer reference. The seller needs a contact
// person, phone and e-mail, the buyer an e-mail — the Pflichtangaben of the XRechnung.
const sellerB2g = {
	...seller,
	contactName: 'Erika Mustermann',
	phone: '030 1234567',
	email: 'rechnung@muster.example',
};
const buyerB2g = {
	name: 'Stadt Beispielhausen',
	street: 'Rathausplatz 1',
	zip: '80331',
	city: 'München',
	country: 'DE',
	email: 'rechnungseingang@beispielhausen.example',
	leitwegId: '991-01234-44',
};
const xrechnungMarkers = [
	'urn:xeinkauf.de:kosit:xrechnung_3.0',
	'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
	'<ram:BuyerReference>991-01234-44</ram:BuyerReference>',
];
try {
	const issued = await issue({
		profile: 'XRECHNUNG',
		seller: sellerB2g,
		buyer: buyerB2g,
		lines: [
			{ description: 'Beratung Verwaltungsprozesse', quantity: 3, unit: 'Std', unitPriceNet: 120, vatRate: 19 },
			{ description: 'Handbuch', quantity: 2, unit: 'Stk', unitPriceNet: 25, vatRate: 7 },
		],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		dueDate: '2026-10-28',
		documentTitle: 'Rechnung',
	});
	await save('xrechnung-b2g', issued, xrechnungMarkers, true);
} catch (error) {
	failed++;
	console.error(`  xrechnung-b2g: ${error.message}`);
}

// XRechnung with an attachment: no PDF container, so the file goes into the XML (BG-24) only.
try {
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
		'base64',
	);
	const draft = await json('POST', '/api/invoices', {
		profile: 'XRECHNUNG',
		seller: sellerB2g,
		buyer: buyerB2g,
		lines: [{ description: 'Leistung mit Nachweis', quantity: 1, unit: 'Std', unitPriceNet: 80, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		documentTitle: 'Rechnung',
	});
	await json('POST', `/api/invoices/${draft.id}/attachments`, {
		filename: 'leistungsnachweis.png',
		mime: 'image/png',
		dataBase64: png.toString('base64'),
	});
	const issued = await json('POST', `/api/invoices/${draft.id}/issue`);
	await save('xrechnung-mit-anlage-bg24', issued, [...xrechnungMarkers, 'AttachmentBinaryObject'], true);
} catch (error) {
	failed++;
	console.error(`  xrechnung-mit-anlage-bg24: ${error.message}`);
}

// The document types the wizard offers, as XRechnung: the XRechnung rule BR-DE-17 allows fewer type codes than
// EN 16931 (380 invoice, 381 credit note, 326 partial invoice, 384, 389, 875-877), so each title is checked.
for (const [slug, title, code] of [
	['xrechnung-abschlagsrechnung', 'Abschlagsrechnung', '326'],
	['xrechnung-schlussrechnung', 'Schlussrechnung', '380'],
	['xrechnung-gutschrift', 'Gutschrift', '381'],
]) {
	try {
		const issued = await issue({
			profile: 'XRECHNUNG',
			seller: sellerB2g,
			buyer: buyerB2g,
			lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 90, vatRate: 19 }],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
			documentTitle: title,
		});
		await save(slug, issued, [...xrechnungMarkers, `<ram:TypeCode>${code}</ram:TypeCode>`], true);
	} catch (error) {
		failed++;
		console.error(`  ${slug}: ${error.message}`);
	}
}

// The reversal of an XRechnung is an XRechnung, too.
try {
	const original = await issue({
		profile: 'XRECHNUNG',
		seller: sellerB2g,
		buyer: buyerB2g,
		lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 250, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		documentTitle: 'Rechnung',
	});
	const reversal = await json('POST', `/api/invoices/${original.id}/storno`, { reason: 'Musterfall Storno' });
	const issued = await json('POST', `/api/invoices/${reversal.reversal.id}/issue`);
	await save('xrechnung-storno', issued, [...xrechnungMarkers, '<ram:TypeCode>381</ram:TypeCode>'], true);
} catch (error) {
	failed++;
	console.error(`  xrechnung-storno: ${error.message}`);
}

// Without the Leitweg-ID the server has to refuse the issue, and the draft stays a draft.
try {
	const draft = await json('POST', '/api/invoices', {
		profile: 'XRECHNUNG',
		seller: sellerB2g,
		buyer: { ...buyerB2g, leitwegId: '' },
		lines: [{ description: 'Beratung', quantity: 1, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
		issueDate: '2026-09-28',
		deliveryDate: '2026-09-27',
		documentTitle: 'Rechnung',
	});
	const response = await fetch(`${base}/api/invoices/${draft.id}/issue`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}` },
	});
	const text = await response.text();
	if (response.ok || !text.includes('Leitweg-ID') || !text.includes('BR-DE-15')) {
		throw new Error(`eine XRechnung ohne Leitweg-ID wurde nicht abgelehnt (${response.status}: ${text})`);
	}
	console.log('  xrechnung ohne Leitweg-ID    abgelehnt, wie vorgesehen');
} catch (error) {
	failed++;
	console.error(`  xrechnung-ohne-leitweg-id: ${error.message}`);
}

console.log(
	failed ? `\n${failed} Musterfall/Musterfaelle fehlgeschlagen.` : `\nAlle Musterfaelle erzeugt in ${target}.`,
);
process.exit(failed ? 1 : 0);
