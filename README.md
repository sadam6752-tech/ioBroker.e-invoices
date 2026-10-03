![Logo](admin/e-invoices.png)
# ioBroker.e-invoices

[![NPM version](https://img.shields.io/npm/v/iobroker.e-invoices.svg)](https://www.npmjs.com/package/iobroker.e-invoices)
[![Downloads](https://img.shields.io/npm/dm/iobroker.e-invoices.svg)](https://www.npmjs.com/package/iobroker.e-invoices)
![Number of Installations](https://iobroker.live/badges/e-invoices-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/e-invoices-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.e-invoices.png?downloads=true)](https://nodei.co/npm/iobroker.e-invoices/)

**Tests:** ![Test and Release](https://github.com/sadam6752-tech/ioBroker.e-invoices/workflows/Test%20and%20Release/badge.svg)

## E-invoices adapter for ioBroker

Create ZUGFeRD e-invoices as PWA with PDF, Excel export and backup

The adapter runs a small web app (PWA) where you create German B2B e-invoices
(ZUGFeRD hybrid: human-readable PDF with embedded EN 16931 XML — the XML is
the leading tax document), store every issued invoice in a local database and
back everything up as versioned ZIP files.

Features:

- Draft → issue flow with atomic invoice numbers per year and employee
  (`YYYY-EE-NNN`, default format `{YYYY}-{EMPLOYEE}-{SEQ}`, e.g. `2026-01-012`)
- Offers ("Angebote") as a second document type with an own number circle,
  validity and life cycle — a plain sight PDF, never an e-invoice, and one
  conversion into an invoice draft
- ZUGFeRD profiles BASIC and EN 16931, offline XSD validation
- Hybrid PDF plus standalone XML for every issued invoice
- Attachments per invoice (delivery note, proof of work) — uploaded in the PWA,
  embedded into the PDF/A-3 file and, for EN 16931, into the XML as BG-24
- Excel copies (single invoice and filtered lists, marked as non-tax copies)
- Layout templates with company logo, colors and footer (mandatory content
  is protected by a validator and cannot be hidden)
- Backup and restore (database plus all files, SHA-256 manifest)
- Controllable via states (`control.*`) and a JSON API for the PWA

## Install

Install it in the admin: **Adapters** → filter for `e-invoices` → install.

After the installation, open the instance settings and check the API port
(default 8093). The PWA is then available on that port of your ioBroker host.
Optionally set an API token there; without a token the API trusts the local
network.

## Usage

### PWA

Open `http://<iobroker-host>:8093/` for the invoice dashboard, the offers tab
("Angebote"), the multi-step wizard (seller → buyer → lines → review), invoice
details with validation, attachments and downloads, layout templates with PDF
preview, backups and a status page. The header bar carries the tabs only — the
"+ Neu" buttons sit where their lists are, and the status page names the app
next to the version and the schema.

### Print templates: fine-tuning the header

Besides logo, colors and blocks, a print template has two header distances, both
in mm from the **top edge of the sheet**:

- **Logo distance from top** — where the logo starts (empty = 12.7 mm, where it
  always sat),
- **Text distance from top** — where the header text starts: the small sender line,
  the recipient address and the invoice data (empty = directly below the logo).

With both empty the layout is exactly the one the template always had. Set only the
logo distance and the text follows the logo; set the text distance and it stays
where you put it, whatever the logo does — so a letterhead with a pre-printed logo or
a window envelope can be matched by eye with the PDF preview. The values apply to
invoices and offers alike, and the logo of the following pages (when it is drawn on
every page) uses the same distance. Allowed are 0 to 150 mm; an empty field takes a
value back.

### Language of the web app

The web app speaks German and English. The language is chosen in the instance
settings (`Web app language`: `auto`, `Deutsch`, `English`, tab *Server*) and the
app starts in it. The first match wins:

1. `?lang=de` / `?lang=en` in the address bar (remembered on that device),
2. the choice remembered on that device,
3. the instance setting — `auto` means "ask the browser",
4. the language of the browser (German or English),
5. English.

The login page already speaks the language of the instance: `GET /api/health`
(the one open route) carries the setting as `pwaLanguage`. What is **document
content** stays German whatever the screen language is: the invoice and offer
PDFs, the XML, the document titles (`Rechnung`, `Angebot`, …), the payment-term
presets and the text of the customer mail. Only their labels in the dropdowns
follow the language of the page.

### Attachments (Anlagen)

A draft can carry up to 10 files (PDF, PNG or JPEG, 5 MB each) — delivery
notes, proofs of work, order confirmations. Upload them in the detail view or
in the last wizard step ("Entwurf speichern" first: a file needs a stored
record to belong to). The type is taken from the file's magic bytes, never
from the name or the declared MIME type.

On issue, the attachments become part of the e-invoice:

- **PDF/A-3:** every file rides along as an associated file
  (`Names → EmbeddedFiles` and the catalogue's `/AF`, `AFRelationship /Data`),
  and the sight component lists them under "Anlagen" with type and size.
- **EN 16931 XML:** each file is written as BG-24 "Additional supporting
  documents" (`BT-122` reference, `BT-123` description, `BT-125` base64
  payload) — embedded, not linked, and XSD-validated like the rest.
  Factur-X's **BASIC** XSD has no `AdditionalReferencedDocument`, so a BASIC
  invoice keeps its files in the PDF container alone (still embedded).
- Issued invoices are frozen (GoBD): the Anlagen can be listed and downloaded,
  but no longer added or deleted. An attachment makes the artifacts and the
  backup noticeably bigger (a 5 MB file counts once in the PDF, once as base64
  in the XML and once as base64 in the backup dump).

### Offers (Angebote)

An offer is a second document type beside the invoice: it shares the record,
the lines, the attachments, the render history and the backup with it, but it is
no e-invoice. Create one with `POST /api/invoices` (`docType: "quote"`) and list
only offers with `GET /api/invoices?docType=quote`.

- **Own number circle:** offers number as `A-YYYY-EE-NNN`. The pattern is the
  instance setting "Quotation number format" (`quoteNumberFormat`, default
  `A-{YYYY}-{EMPLOYEE}-{SEQ}`). Offers never consume an invoice number — the
  invoice sequence stays continuous (§ 14 Abs. 4 Nr. 4 UStG).
- **Own validity:** `validUntil` ("Gültig bis") defaults to the issue date plus
  30 days and is printed on the offer. Offers carry no retention date (§ 147 AO
  concerns invoices) and no Leitweg-ID.
- **Plain sight PDF, never an e-invoice:** no CII XML, no PDF/A-3 container, no
  BG-24 and no `pdfaid` claim. On issue only the PDF is stored; the attachments
  are listed under "Anlagen" with the note that they travel separately instead
  of being embedded. `POST /api/invoices/:id/validate` reports business findings
  only — there is no EN 16931 document to check, so it never reports XSD
  findings.
- **Life cycle:** draft → open → accepted or rejected, or expired once the
  validity date has passed (computed from the date, no timer). The decision is
  recorded with its timestamp by `POST /api/invoices/:id/quote-accept` or
  `…/quote-reject` with a free-text reason; the first decision counts and a
  second one is refused. The sight PDF prints it ("Angenommen am …",
  "Abgelehnt am …: …", "Das Angebot ist am … verfallen.").
- **Conversion:** `POST /api/invoices/:id/convert` creates an invoice *draft*
  (the number is assigned on issue as usual) that copies header and lines,
  translates the dates and keeps the link back (`sourceDocumentId`, printed as
  "Zugrunde liegendes Angebot" / "Daraus hervorgegangene Rechnung(en)"). By
  default the offer must have been accepted — `{ "requireAccepted": false }`
  overrides that — and a second open converted draft is refused. The offer
  itself is never touched.
- **Not revenue:** offers are never dunned and stay out of the accounting
  exports. CSV, DATEV and XLSX only export invoices unless the caller asks
  otherwise: without a `docType` parameter they are pinned to invoices, the
  explicit counter-word is `?docType=all` (and `?docType=quote` exports the
  offers alone).

In the PWA, offers have their own tab (**Angebote**): the list shows the state
(open, accepted, rejected, expired), records the customer's answer and turns an
accepted offer into an invoice draft in one click ("In Rechnung umwandeln").
"+ Neues Angebot" opens the wizard with the document type preselected — the same
wizard as for invoices, without the invoice-only fields: no "Fällig am", no
Skonto, no payment terms, but a "Gültig bis" date that follows the issue date
(30 days) while it stays untouched. An invoice draft made from an offer links
back ("Zugrunde liegendes Angebot"), and the offer lists the invoices it became.
The wording of every screen comes from one table per document type
(`src-www/src/labels.ts`), which mirrors the server's `documentLabels()` — no
offer screen says "Rechnung". The booking list and the three accounting exports
stay pinned to `docType=invoice`, so the two document types never mix.

### Open items (Offene Posten)

The tab *Offene Posten* lists the unpaid, issued invoices with their age and adds
them up: per age bucket (not due · 1–30 · 31–60 · 61–90 · over 90 days overdue),
per customer and in total, with a switch for the overdue part and a reference day
(*Stichtag*). The dashboard carries a one-line tile with the same sums. The list
is also available as CSV and Excel (`GET /api/open-items`, `.csv`, `.xlsx`, filters
`asOf=YYYY-MM-DD` and `onlyOverdue=1`); all three come from one calculation, so
their sums are identical.

What counts: issued **invoices** that are **not marked as paid**. Offers, drafts,
cancelled originals, Storno credit notes and documents titled *Gutschrift* do not
count — the record has no allocation of a credit note to the invoice it settles, so
they are left out instead of guessed. The record has no part payments either, so
the open amount of an invoice is its gross total. An invoice without a due date is
listed as *not due*. The reminder list (`info.overdue*`) is the narrower one: it
starts five days after the due date and stays quiet for a day after a reminder.

### States

- `info.connection`, `info.invoiceCount`, `info.draftCount`,
  `info.issuedCount`, `info.lastNumber`, `info.lastIssuedAt`,
  `info.dbVersion`, `info.lastBackup`
- `control.createDraft` (button: creates an empty draft, id lands in
  `control.lastDraftId`), `control.issueId` + `control.issue` (button:
  issues a draft), `control.refresh`, `control.backup`,
  `control.restoreId` + `control.restore` (buttons for backup/restore)

### Files and backup

Issued artifacts (PDF/XML/XLSX), logos and backup ZIPs live below the
`e-invoices.0.storage` file mount. The database file `invoices.db` lives in
the instance data directory.

For disaster recovery, back up both: the instance (covers the database and
the storage files, which are kept as user files) and, additionally, create
adapter backups from the PWA Backup page or the `control.backup` state.
To move to another system, restore an adapter backup ZIP there via the PWA
or `control.restoreId` + `control.restore`. The restore verifies checksums
first and replaces the database in one transaction.

When using the BackItUp adapter, include this adapter instance and its
files in the backup job.

### API

Same-origin JSON API under `/api` (health, invoices CRUD, issue, validate with
a stored report, XML/PDF/XLSX downloads, attachments of a draft — list, upload
as base64 JSON, download, delete —, offers (list by document type, accept,
reject, convert into an invoice draft), templates with logo upload and PDF
preview, backups, restore, open items as JSON, CSV and Excel). With an API token configured, every route except
`/api/health` requires an `Authorization: Bearer <token>` header.

## Security notes

- **Token:** set `authToken` in the instance configuration. Every API route except
  `/api/health` then requires `Authorization: Bearer <token>`; without a token the
  API trusts every client that can reach the port. In that case it only answers
  requests whose host name is an IP address or `localhost` (so a web page cannot
  steer your browser to the adapter by DNS rebinding) and refuses writes that carry a
  foreign `Origin`; reach the PWA by IP address, or set a token to use a host name.
  Use a long random token (the adapter warns below 16 characters).
- **Bind address:** `bind` defaults to `127.0.0.1`, so only the host running the
  adapter can reach the API. An unauthenticated bind to another interface is
  logged as a warning on startup — use a token in that case.
- **Rate limits:** 600 requests per minute and client on `/api`, but only 10 on
  `/api/restore*`, which replaces the whole database. Exceeding a budget answers
  `429 Too many requests` and logs method plus path (never the token).
- **Browser hardening:** API and PWA answer with a self-only Content Security
  Policy (`default-src 'self'`, `frame-ancestors 'none'`), `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: no-referrer` and without `X-Powered-By`.
  `X-Forwarded-*` headers are not trusted (`trust proxy` disabled) — the adapter
  is meant to be reached directly; put it behind a reverse proxy only with HTTPS
  and a token.
- **Restore safety:** before a restore replaces the database, the current state is
  written to `backups/e-invoices-prerestore-<time>.zip`; if that fails, nothing is
  restored. Number counters are never lowered, and every restore is appended to
  `backups/restore-log.jsonl`.
- **Restore limits:** a backup ZIP may be at most 512 MB and expand to at most
  1 GB (`dump.json` at most 256 MB); a crafted archive is rejected before it is
  unpacked. Entry paths, per-file checksums and the manifest are verified.
- **Where the PWA keeps the token:** in the browser profile's `localStorage`, so a
  reload does not ask again. It is only ever sent as an `Authorization` header to
  the adapter (never in a URL), but a script running on the same origin could read
  it — use a dedicated browser profile, and note that changing the token in the
  instance config takes effect after the adapter restart.
- **Attachments:** a draft may carry at most 10 files of 5 MB each, and only PDF,
  PNG or JPEG. The type is decided by the file's magic bytes, not by its name or
  the declared MIME type, and the filename is cleaned before it can reach a
  `Content-Disposition` header. An issued invoice is frozen: its attachments can
  be listed and downloaded, but no longer added or deleted (GoBD) — they are
  part of the stored PDF/XML by then.
- **Backup files are not encrypted:** the ZIP contains the database, attachments
  and XML/PDF artifacts in plain text. Keep it on an encrypted volume or share.
  Attachments ride in `dump.json` as base64, so a backup with Anlagen is roughly
  a third larger than the raw files.

## Why compact mode is off (W5049)

This adapter sets `common.compact` to `false` on purpose: it keeps its own
SQLite database file and serves the PWA plus JSON API on its own TCP port,
so it cannot share the compact process.

## Limitations

- The sight PDFs embed Liberation Sans (SIL OFL 1.1) and carry an sRGB
  output intent, so they are built as PDF/A-3b; the structure was verified
  against a real invoice (`/OutputIntents` with `GTS_PDFA1`, font subsets
  with `/FontFile` and `/ToUnicode`). An independent validator run (KoSIT
  online validator or veraPDF) is still the recommended acceptance step
  before productive use. The embedded XML is unaffected and stays the
  leading part.
- The offline XSD validation runs on every issue; the KoSIT online
  validator is a recommended manual acceptance step before productive use.
- Only EUR, domestic B2B invoices and the BASIC/EN 16931 profiles are
  supported in this version.

## Disclaimer

**Disclaimer.** This software is provided free of charge and "as is", without warranty of any kind and without any assurance of fitness for a particular purpose. It is not tax or legal advice. To the extent permitted by law, liability is excluded; liability for intent and gross negligence, for injury to life, body or health, and under mandatory law remains unaffected. You are responsible for:

- the correctness of your invoices and offers and for checking the results (e.g. with a validator or your tax advisor),
- compliance with the rules that apply to you (e.g. VAT law, GoBD, retention periods, GDPR),
- regular backups – also outside the adapter – and testing that they can be restored.

**Haftungsausschluss.** Dieses Programm wird unentgeltlich und so bereitgestellt, wie es ist – ohne Gewähr und ohne Zusicherung einer bestimmten Beschaffenheit oder Eignung. Es ersetzt keine Steuer- oder Rechtsberatung. Soweit gesetzlich zulässig, ist die Haftung ausgeschlossen; unberührt bleibt die Haftung für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper und Gesundheit und nach zwingendem Recht. Du bist selbst verantwortlich für:

- die inhaltliche und rechnerische Richtigkeit deiner Rechnungen und Angebote sowie die Prüfung der Ergebnisse (z. B. mit einem Validator oder deinem Steuerberater),
- die Einhaltung der geltenden Vorschriften (u. a. UStG, GoBD, Aufbewahrungsfristen, DSGVO),
- regelmäßige Datensicherungen – auch außerhalb des Adapters – und deren Wiederherstellungstest.

## Standards and references

This adapter is built around an invoice *format*, not a device, so the
reference "manufacturer" documentation is the specification it implements:

- [Factur-X / ZUGFeRD](https://fnfe-mpe.org/factur-x/) — the Franco-German
  hybrid invoice standard (readable PDF with the leading CII XML inside) and
  the profiles used here (BASIC, EN 16931).
- [KoSIT Validator](https://github.com/itplr-kosit/validator) — the open
  validation engine for EN 16931 documents; its configuration for
  XRechnung/EN 16931 is what the manual acceptance check described under
  "Limitations" runs.
- [@stackforge-eu/factur-x](https://www.npmjs.com/package/@stackforge-eu/factur-x) —
  the library that generates the CII XML and embeds the hybrid PDF.

The German rules behind the numbering and retention logic come from § 14 UStG
and § 147 AO; the adapter implements them, it is not a substitute for tax
advice.

## Provenance

All adapter sources in `src/` and the PWA in `src-www/` are written for
this project. Third-party libraries (plain npm dependencies, no copied
code): `@stackforge-eu/factur-x` (EUPL-1.2) for CII generation, XSD
validation and hybrid embedding, `pdfkit`, `exceljs`, `jszip`,
`better-sqlite3` and `express` (all MIT).

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.8.6 (2026-10-03)

* (alex) New logo: the envelope with the euro sheet is the adapter icon now (admin, installed web app, favicon). The web app icons are generated from `admin/e-invoices.svg` (`node src-www/scripts/make-icons.mjs`).
* (alex) Print templates got two header distances in mm from the top edge of the sheet: where the logo starts and where the header text (sender line, recipient, invoice data) starts. Empty keeps the layout as it was; the preview uses the values too. An update of a template only merges what it receives, so an emptied field is sent as `null` — which also fixes unlinking the company from a template.

### 0.8.5 (2026-10-02)

* (alex) Disclaimer: the README carries a liability clause (English and German) and the status page of the web app points to it.

* (alex) Open items (R6.2): the new tab *Offene Posten* and a tile on the dashboard show the unpaid invoices with an aging list (not due, 1–30, 31–60, 61–90, over 90 days overdue), the sums per bucket and per customer, an overdue filter and a reference day; the same list is available as CSV and Excel and all three formats come from one calculation. Offers, drafts, Storno credit notes and cancelled originals are not part of it.

* (alex) Hardening from the code review (M4/M5): every download builds its `Content-Disposition` through one function (ASCII fallback plus RFC 5987 name, quotes and line breaks cannot leave the header), the PDF and Excel routes refuse a stored path that points out of the storage, and a restore rejects a backup whose document numbers or artifact paths do not look like what the adapter writes itself — even when its checksums match.
* (alex) Two defects found by the new integration test on a real js-controller: writing the text states `control.issueId` or `control.restoreId` ran a command by itself and then tried to acknowledge it with `true` (a text state refused it and logged it) — only the buttons (`createDraft`, `issue`, `refresh`, `backup`, `restore`) react now; and the info states (`info.issuedCount`, `info.invoiceCount`, …) only moved when a control button was pressed, so invoices issued in the web app left them stale — every successful change through the API refreshes them now (collected over half a second).
* (alex) More tests, no change of behaviour: the Excel copy is proven to carry the same net, VAT and gross amounts as the stored record and the XML (BT-109/110/112 and the tax breakdown per rate), attachments are proven to be embedded and never linked, an attachment cannot stand in for a mandatory field, checking a draft consumes no number, and the integration test covers states, issue flow, backup and restore, restart and the released port.

### 0.8.4 (2026-10-02)

* (alex) The toolbar of the invoice and offer lists lays out as a grid now: the filters share the first line in equal parts, the search takes the free width of the second line and the buttons keep their size.
* (alex) The web app speaks English now (R7.2): the instance setting `Web app language`
  (`auto`, `Deutsch`, `English`) decides the start language, `?lang=de|en` overrides it on a
  device, `auto` follows the browser, and the login page already uses the language of the
  instance (`/api/health` carries `pwaLanguage`). The German sentence is the key of the
  translation, so a missing English entry shows German instead of a hole; a test keeps
  both languages in step. PDFs, XML, document titles and payment-term presets are document
  content and stay German. The status badges of the lists read `Entwurf` / `ausgestellt` /
  `storniert` (German) or `draft` / `issued` / `cancelled` (English) instead of the raw
  API words, and the wizard names the invoice number format `JJJJ-EE-LLL` like the docs.

### 0.8.3 (2026-10-02)

* (alex) The toolbar of the invoice and offer lists sits on two lines now: the filters above, the search and the buttons below, so it no longer wraps into a ragged shape on narrow screens.
* (alex) Three safeguards from the code review of 2 October 2026:
  **Re-render** never overwrites an archive any more — every run keeps its own
  `<number>.orig-<n>.pdf`, so the delivered original stays retrievable however often the
  sight PDF is rendered again — and it embeds the XML as issued instead of generating it
  anew, so database, `.xml` file and the XML inside the PDF cannot drift apart.
  **Without an API token** the API now accepts only IP addresses and `localhost` as host
  name and refuses cross-origin writes (DNS rebinding, CSRF); with a token nothing
  changes. **Restore** saves the current state as `backups/e-invoices-prerestore-<time>.zip`
  first (no safety copy, no restore), never moves a number counter backwards — an
  invoice number is not issued twice after restoring an older backup — and appends
  every restore to `backups/restore-log.jsonl`.
* (alex) The web app sources are linted now (R5.3): `src-www/src/**/*.ts` runs through the
  same ESLint set as the adapter, with the browser globals and the `src-www` tsconfig, so
  the PWA is no longer the one corner of the repository that no rule looks at. The first
  run paid for itself: the wizard read its settings object before declaring it (the same
  class of temporal-dead-zone bug as the wizard defect of September 2026 — the
  declaration now sits above its use), the customer-number button printed
  "[object Object] vergeben." instead of the count, and the two identical `FileReader`
  copies in the backup and template views became one checked helper (`fileToBase64`),
  which no longer turns a missing string into `[object ArrayBuffer]`. Only formatting
  changed beyond that (Prettier, braces). `npm run lint` covers the PWA: 0 errors,
  remaining warnings are JSDoc wishes, not defects.
* (alex) The invoice and offer lists lay their controls on two lines: the filters
  (status, sort, sent) share the first line and the search sits on the second next
  to the buttons ("+ Neu", Excel, CSV, DATEV, "Ausstellen"). One single row had
  grown too crowded and wrapped into a ragged shape on a narrow screen.

### 0.8.2 (2026-10-01)
* (alex) The header bar carries the tabs and nothing else now: the "+ Neu" button
  moved to the lists it creates records for (the invoice dashboard and the offers
  tab own theirs), and the app names itself on the status page, next to the
  version and the schema, instead of in the navigation.
* (alex) The accounting exports decide the document type themselves: CSV, DATEV
  and XLSX are pinned to invoices even when the caller sends no `docType` at all
  (the dashboard buttons keep sending `docType=invoice`), `?docType=all` exports
  both types and `?docType=quote` only the offers. One helper (`docTypeFilter()`)
  carries the rule; the invoice list route shares it without a fallback of its own.
* (alex) The offer suite of the browser tests covers the rest of the life cycle:
  the "no" of a customer together with the sent mark, the batch issue of the
  drafts a search shows, the accepted offer that becomes two invoices (a second
  draft is refused while the first is open and allowed once it is issued) and the
  offer that ran out of time ("Verfallen", which can still be accepted). Coverage:
  `npm run test:ts` 181, `npm run test:api` 41, `npm run test:pwa` 21,
  `npm run test:e2e` 17, lint and `tsc` clean.

### 0.8.1 (2026-10-01)
* (alex) Offers are part of the PWA now: the new tab "Angebote" lists them with
  their state (open, accepted, rejected, expired), records the answer of the
  customer with a reason and turns an accepted offer into an invoice draft in one
  click. "+ Neues Angebot" opens the wizard with the document type preselected —
  the same steps as an invoice, only the payment due date, the cash discount and
  the payment terms are replaced by the validity date ("Gültig bis"), which
  follows the issue date (30 days) while it has not been touched.
* (alex) The interface speaks the language of the document it shows: one table
  per document type (`src-www/src/labels.ts`, mirroring `documentLabels()` and
  the quotation life cycle of the server) replaces the hard-wired "Rechnung", the
  detail page carries accept, reject and convert and prints the decision the way
  the sight PDF does. Offer and invoice link to each other in both directions
  ("Zugrunde liegendes Angebot" / "Daraus hervorgegangene Rechnung(en)"; the
  invoice list gained a `sourceDocumentId` filter for that).
* (alex) The booking list and the accounting exports never carry an offer: the
  dashboard and its XLSX/CSV/DATEV buttons pin `docType=invoice`, so the document
  type is no longer left to the caller. Coverage: a browser test walks the whole
  chain (wizard → issue → accept → convert → export) and checks that the
  A-number stays out of the list and out of the CSV — `npm run test:ts` 181,
  `npm run test:api` 41, `npm run test:pwa` 18, `npm run test:e2e` 13, lint and
  `tsc` clean.

### 0.8.0 (2026-10-01)
* (alex) The adapter knows a second document type: offers ("Angebote"). The
  document type is data now (`doc_type`: `invoice` | `quote`, migration v12) —
  the displayed title stays a label, while numbering, validation, mandatory
  fields and the PDF wording follow the type. An offer has its own number circle
  (`A-{YYYY}-{EMPLOYEE}-{SEQ}`, "Quotation number format" in the instance
  settings), its own validity ("Gültig bis", default issue date + 30 days) and
  its own life cycle: draft → open, ended by `accepted` or `rejected`, or
  `expired` once the validity date has passed (computed, without a timer).
* (alex) An offer is not an e-invoice, and the release says so on every level:
  no CII XML, no PDF/A-3 container, no BG-24, no `pdfaid` claim, no retention
  date (§ 147 AO concerns invoices) and no Leitweg-ID. On issue it stores a
  plain sight PDF (labels "Angebotsnr.", "Angebotsdatum", "Leistungszeitraum",
  "Gültig bis") whose attachments are listed under "Anlagen" with the note that
  they travel separately instead of being embedded. `POST
  /api/invoices/:id/validate` answers with business findings only — it never
  reports XSD findings that would pretend an EN 16931 document exists.
* (alex) An offer has a documented outcome: `POST
  /api/invoices/:id/quote-accept` and `…/quote-reject` (with a free-text reason)
  store the decision with its timestamp. The first decision counts — a second
  one is refused — and the sight PDF prints it ("Angenommen am …", "Abgelehnt
  am …: …", "Das Angebot ist am … verfallen.").
* (alex) An accepted offer becomes an invoice without retyping: `POST
  /api/invoices/:id/convert` creates an invoice draft (the number falls on
  issue, as usual) that copies header and lines, translates the dates and keeps
  the link back (`sourceDocumentId`, printed as "Zugrunde liegendes Angebot" /
  "Daraus hervorgegangene Rechnung(en)"). By default the offer must have been
  accepted — `{ "requireAccepted": false }` overrides that — and a second open
  converted draft is refused. The offer itself is never touched.
* (alex) Offers stay out of the accounting: they are never dunned (a reminder
  candidate is always an invoice), `GET /api/invoices` filters by `docType` and
  the CSV/DATEV/XLSX exports take `?docType=invoice|quote`. The invoice number
  sequence is untouched by all of this — migration v12 moves the existing
  counters over unchanged and lets the offer counter start at 1 (§ 14 Abs. 4
  Nr. 4 UStG, no renumbering).
* (alex) The PWA screens for offers are not part of this version: creating,
  deciding and converting an offer goes through the API. Backend, API and admin
  (plus its eleven translations) are in place; coverage comes from the unit
  tests of the database, the invoice model and the issue service and from a new
  API suite for quotations — `npm run test:ts` 181 tests, `npm run test:api` 41
  tests, lint and `tsc` clean.

### 0.0.7 (2026-09-30)
* (alex) The admin translations are proper UTF-8 again: all eleven
  `admin/i18n/*.json` files had once been written with the Windows code page
  1252, so the instance settings showed "StraÃŸe" instead of "Straße". The key
  of the company hint was mangled as well, which is why its German text was
  never used. A new test (`npm run test:i18n`) keeps both from happening again.
* (alex) Invoices can carry attachments now ("Anlagen"): drafts accept up to 10
  files of 5 MB each (PDF/PNG/JPEG) over `GET/POST/DELETE
  /api/invoices/:id/attachments` plus a download route per file, and the PWA
  has its own section for it (upload with progress, list with type and size,
  download, delete) in the detail view and in the last wizard step. The rules
  live in one place (`src/lib/attachments.ts`) and are enforced by the database,
  so every caller obeys them: the type is taken from the file's magic bytes
  instead of its name or the declared MIME type, and issued invoices stay frozen
  (GoBD) — their files can be read, but no longer changed.
* (alex) On issue the attachments become part of the e-invoice: the Stored PDF
  carries them as PDF/A-3 associated files (`/AFRelationship /Data` in the
  embedded-file name tree) and lists them under "Anlagen"; an EN 16931 invoice
  writes each file as BG-24 "Additional supporting documents" with the payload
  embedded base64 (Factur-X's BASIC schema has no such node, so a BASIC invoice
  keeps its files in the PDF container). The validator stays at zero errors —
  covered by new tests for the XML, the embedded files, the Anlagenverzeichnis
  and the backup round-trip.

### 0.0.6 (2026-09-30)
* (alex) The start page no longer logs a `404` for `/favicon.ico`: the page
  links its own icon and the adapter answers the browser's implicit request
  with the PWA icon.

### 0.0.5 (2026-09-30)
* (alex) The PWA start page no longer stays blank when the app is opened through
  a LAN address (`http://192.168.x.y:8093`): helmet's default
  `upgrade-insecure-requests` directive made the browser request the JavaScript,
  the CSS and `registerSW.js` over `https://`, which failed with a CORS error.
  The directive is switched off, so plain-HTTP origins load the app again
  (`localhost`/`127.0.0.1` were never affected).

### 0.0.4 (2026-09-30)
* (alex) Reverse charge invoices now carry the buyer's tax identifiers (BT-48) in the CII XML,
  so they pass the EN 16931 rule `[BR-AE-02]` (R2).
* (alex) The never published 0.0.2 is gone from `common.news` and the changelog — the adapter
  checker no longer reports it.
* (alex) Quality: the unit tests run in the adapter test matrix, 11 Playwright tests cover the
  backup/restore chain, the PDF/A-3b structure and three sample cases, and the validation
  report documents the whole inventory (16/16 CII XMLs and 15/15 delivered PDFs conform;
  KoSIT 1.6.3 and veraPDF 1.30.2, after the legacy invoices were re-rendered on 30.09.).

### 0.0.3 (2026-09-30)
* (alex) Every validation run stores its report next to the artifacts
  (`…validation-<n>.json`) and the detail view links the reports of earlier
  runs, so the plausibility check of an e-invoice is reproducible (R2).
* (alex) Security hardening: `helmet` with a self-only content security policy,
  timing-safe token comparison, rate limits (600/min on `/api`, 10/min on
  `/api/restore`) and ZIP-bomb guards for restores; the new "Security notes"
  section documents token handling, bind address and backup encryption.

### 0.0.2 — skipped (2026-09-30)
The tag was withdrawn before the release job could publish it: the first version
that came out of the tag pipeline (npm provenance via Trusted Publishing) is
0.0.3.

### 0.0.1
* (alex) initial release
* (alex) `build:pwa` clears `www/` first; the adapter now logs its own warning
  when the sRGB profile for PDF/A-3 is missing

## License
MIT License

Copyright (c) 2026 alex <sadam6752@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
