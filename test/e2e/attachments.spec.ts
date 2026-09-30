/**
 * R4 acceptance: a draft with two Anlagen is issued and the file that leaves the
 * house carries them — embedded in the PDF/A-3 container next to the ZUGFeRD XML
 * and written into the XML as BG-24. The outcome is exactly the case the roadmap
 * asks for: "the PDF visibly lists the attachments and contains them embedded".
 *
 * The external validator (KoSIT, veraPDF) stays a manual step; the XSD check runs
 * inside the adapter on issue and fails the request when the XML does not conform.
 */
import { expect, test } from '@playwright/test';

import { readPdfStructure } from './pdf-structure';

/** Token the end-to-end server expects (see `test/e2e/server.mjs`). */
const token = process.env.E2E_TOKEN ?? 'e2e-token-2026';

/** Header every API call of this suite needs while a token is configured. */
const auth = { authorization: `Bearer ${token}` };

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
	name: 'Kunde AG',
	street: 'Kundenweg 5',
	zip: '80331',
	city: 'München',
	country: 'DE',
	customerNumber: 'K-42',
};

/** Minimal PNG: signature plus IHDR, enough for the magic-byte check. */
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);

/** Minimal PDF body: the content starts with the magic bytes the check looks for. */
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'latin1');

test('freezes two Anlagen into the issued PDF and XML', async ({ request }) => {
	// 1. a draft with two attachments
	const created = await request.post('/api/invoices', {
		headers: auth,
		data: {
			seller,
			buyer,
			lines: [{ description: 'Beratung', quantity: 2, unit: 'Std', unitPriceNet: 100, vatRate: 19 }],
			issueDate: '2026-09-28',
			deliveryDate: '2026-09-27',
			currency: 'EUR',
			documentTitle: 'Rechnung',
		},
	});
	expect(created.status()).toBe(201);
	const id = ((await created.json()) as { id: string }).id;

	const uploads = [
		{ filename: 'Lieferschein.pdf', mime: 'application/pdf', dataBase64: pdf.toString('base64') },
		{ filename: 'Foto.png', mime: 'image/png', dataBase64: png.toString('base64') },
	];
	const uploaded: number[] = [];
	for (const upload of uploads) {
		const res = await request.post(`/api/invoices/${id}/attachments`, { headers: auth, data: upload });
		expect(res.status(), `${upload.filename} was not accepted`).toBe(201);
		uploaded.push(((await res.json()) as { id: number }).id);
	}

	// a file whose content is not PDF/PNG/JPEG is refused with the reason
	const rejected = await request.post(`/api/invoices/${id}/attachments`, {
		headers: auth,
		data: { filename: 'notizen.txt', mime: 'text/plain', dataBase64: Buffer.from('hallo').toString('base64') },
	});
	expect(rejected.status()).toBe(400);

	const listed = await request.get(`/api/invoices/${id}/attachments`, { headers: auth });
	expect(listed.status()).toBe(200);
	const files = (await listed.json()) as { filename: string; mime: string; size: number }[];
	expect(files.map(file => file.filename)).toEqual(['Lieferschein.pdf', 'Foto.png']);
	// the stored type comes from the content, not from the name
	expect(files.map(file => file.mime)).toEqual(['application/pdf', 'image/png']);

	// 2. issue: the attachments become part of the record
	const issued = await request.post(`/api/invoices/${id}/issue`, { headers: auth });
	expect(issued.status()).toBe(200);

	// 3. the PDF container carries the XML and both Anlagen
	const pdfResponse = await request.get(`/api/invoices/${id}.pdf`, { headers: auth });
	expect(pdfResponse.status()).toBe(200);
	const structure = await readPdfStructure(await pdfResponse.body());
	const names = structure.embeddedFiles.map(file => file.name);
	expect(names).toContain('Lieferschein.pdf');
	expect(names).toContain('Foto.png');
	expect(names.some(name => name.toLowerCase().endsWith('.xml'))).toBe(true);
	// PDF/A-3 § 6.8: one entry per associated file, each with its relation
	expect(structure.associatedFileCount).toBe(structure.embeddedFiles.length);
	const xmlFile = structure.embeddedFiles.find(file => file.name.toLowerCase().endsWith('.xml'));
	expect(xmlFile?.afRelationship).toBe('Alternative');
	const note = structure.embeddedFiles.find(file => file.name === 'Lieferschein.pdf');
	expect(note?.afRelationship).toBe('Data');
	expect(note?.mimeType).toBe('application/pdf');
	expect(note?.size).toBe(pdf.length);
	const photo = structure.embeddedFiles.find(file => file.name === 'Foto.png');
	expect(photo?.afRelationship).toBe('Data');
	expect(photo?.size).toBe(png.length);

	// 4. the XML names them as BG-24 with the payload embedded base64
	const xmlResponse = await request.get(`/api/invoices/${id}.xml`, { headers: auth });
	expect(xmlResponse.status()).toBe(200);
	const xml = await xmlResponse.text();
	expect(xml).toContain('<ram:AdditionalReferencedDocument>');
	expect(xml).toContain('<ram:TypeCode>916</ram:TypeCode>');
	expect(xml).toContain('mimeCode="application/pdf" filename="Lieferschein.pdf"');
	expect(xml).toContain(pdf.toString('base64'));

	// 5. the file itself is downloadable, byte for byte
	const download = await request.get(`/api/invoices/${id}/attachments/${uploaded[0]}`, { headers: auth });
	expect(download.status()).toBe(200);
	expect(download.headers()['content-type']).toContain('application/pdf');
	expect(Buffer.from(await download.body()).equals(pdf)).toBe(true);

	// 6. GoBD: the issued invoice keeps its files and refuses changes
	const lateUpload = await request.post(`/api/invoices/${id}/attachments`, {
		headers: auth,
		data: { filename: 'Nachtrag.png', mime: 'image/png', dataBase64: png.toString('base64') },
	});
	expect(lateUpload.status()).toBe(400);
	const lateDelete = await request.delete(`/api/invoices/${id}/attachments/${uploaded[0]}`, { headers: auth });
	expect(lateDelete.status()).toBe(400);
	const after = await request.get(`/api/invoices/${id}/attachments`, { headers: auth });
	expect(((await after.json()) as unknown[]).length).toBe(2);
});
