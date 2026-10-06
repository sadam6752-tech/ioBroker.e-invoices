# Older changes

Changelog entries of ioBroker.e-invoices that are no longer listed in the README (the README keeps the last five versions). Newest first.

### 0.9.1 (2026-10-04)

* (alex) Fix: the file-based migration tests got a 30 s mocha timeout (they timed out on slow CI runners). Code documentation: all JSDoc warnings of the web app and the tests are fixed, `npm run lint` reports nothing. No functional change.

### 0.9.0 (2026-10-04)

* (alex) Test print of the print templates with three sample documents: full invoice (two VAT rates, line discount, Skonto), small business (§ 19 UStG) and credit note.
* (alex) README: first steps, e-invoices in a nutshell, retention and GoBD, what the adapter is not. New `docs/performance.md` (measurements up to 5 000 invoices) and a Lighthouse report (`docs/validierung`: PWA 100, accessibility 100).
* (alex) Fix: the dunning check searched the cancelled documents once per overdue invoice (slow with many invoices, and it only saw the 50 newest); it is a single pass now. Tests for the whole migration chain (every schema version v1–v14 upgrades to the latest and keeps number and counter).
* (alex) Dunning (Mahnwesen): the new page shows the next dunning step per overdue invoice with the text filled in (reminder, 1st and 2nd dunning letter), editable texts, days and payment deadlines (new table `dunning_texts`, migration v15, part of the backup), all letters as one PDF and as CSV, state `info.reminderSuggestions`. The adapter still sends nothing and creates no XML; "Mark as reminded" moves the level on and the invoice shows level and date. Fix: a Storno credit note is no longer proposed for a reminder.

### 0.8.8 (2026-10-03)

* (alex) Fix: lint error in the web app (braces around the re-render button loop) that kept release 0.8.7 from passing the checks. Same content as 0.8.7.

### 0.8.7 (2026-10-03)

* (alex) Several companies: a document is bound to the company profile it was written for (new column `company_id`, migration v14; documents from before have none). Wizard stores the choice, a Storno and an invoice made from a quotation take it over, the invoice list and the exports can be filtered by company, and the new page "Umsatz" (`/api/reports/revenue-by-company`, CSV, Excel) adds the issued invoices up per company. The invoice number stays one circle for all companies.
* (alex) The layout an invoice is issued with is frozen with it (template definition and a copy of the logo under `logos/frozen/`, stored in the new column `template_snapshot_json`, migration v13). Re-render now offers the choice: with the **current** print template (default — what you want after changing the template) or with the **issued layout** (reproduces the delivered document). The re-render history says which one was used. Documents issued before this version have no frozen layout; their first re-render freezes the layout it uses. The snapshot and its logo are part of the backup.

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
  the payment terms are replaced by the validity date ("Valid until"), which
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
  settings), its own validity ("Valid until", default issue date + 30 days) and
  its own life cycle: draft → open, ended by `accepted` or `rejected`, or
  `expired` once the validity date has passed (computed, without a timer).
* (alex) An offer is not an e-invoice, and the release says so on every level:
  no CII XML, no PDF/A-3 container, no BG-24, no `pdfaid` claim, no retention
  date (§ 147 AO concerns invoices) and no Leitweg-ID. On issue it stores a
  plain sight PDF (labels "Angebotsnr.", "Angebotsdatum", "Leistungszeitraum",
  "Valid until") whose attachments are listed under "Attachments" with the note that
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
  1252, so the instance settings showed a mis-decoded street label instead of the right one. The key
  of the company hint was mangled as well, which is why its German text was
  never used. A new test (`npm run test:i18n`) keeps both from happening again.
* (alex) Invoices can carry attachments now ("Attachments"): drafts accept up to 10
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
  embedded-file name tree) and lists them under "Attachments"; an EN 16931 invoice
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
## 1.0.2 (2026-10-04)

* (alex) System page: the topics are tabs inside the page (*Status*, *Backup*, *Firma*, *Druckvorlagen*) and only the chosen one is shown, instead of one long page with everything below each other.

## 1.0.1 (2026-10-04)

* (alex) External validation of the generated e-invoices is automated: `npm run validate` makes the sample cases over the real API stack and checks every XML with the KoSIT validator (EN 16931, CII; tools downloaded once and pinned by SHA-256); the GitHub workflow `Validate invoices` runs it monthly and on changes of the XML/PDF code, and checks the PDF files with veraPDF (PDF/A-3b). It is not part of the release workflow.
* (alex) Hardening: wrong tokens are throttled separately (twenty per minute and client; asking without a token is not counted); the open health route no longer reports document counts (they moved to the authenticated `/api/status`). Issuing a document dated in an earlier year asks first, because the number follows the year of the date and the numbers are then not in time order (the log says so as well). The retention note now names the statutory minimum for invoices (eight years since 2025) next to the ten years the adapter keeps to be on the safe side. Dependabot no longer merges patches of the libraries that write the invoice (better-sqlite3, pdfkit, pdf-lib, jszip, express, factur-x) by itself.
* (alex) Backup: a backup that the restore would refuse (ZIP, `dump.json`, unpacked size or number of files above the restore limits) is no longer created without notice — it is refused with a message that names the limit. Attachments count as base64 in `dump.json`.
* (alex) New **System** page: status, backup and restore, company data, print templates and appearance on one page, so the header bar loses the tabs "Backup", "Firma", "Druckvorlagen" and "Status" (twelve entries became eight; the old addresses still work).
* (alex) Issuing is checked before the number is taken: the documents are made once with a placeholder number first, so a defect stops there with the draft untouched. A document that is still left without its files shows up on the dashboard and *Rebuild files* makes only the missing ones from the stored data (the XML from the record, the PDF with the layout frozen at issue, the Excel copy); existing files are never touched.

## 1.0.0 (2026-10-04)

* (alex) First stable release: ZUGFeRD / EN 16931 e-invoices with offers, Storno, attachments, print templates, several companies, open items, dunning, exports with a date range, automatic backup and a German/English web app in a light or dark appearance. No functional change compared with 0.9.5; the changelog was shortened (older entries are in `CHANGELOG_OLD.md`).

## 0.9.5 (2026-10-04)

* (alex) Dark appearance of the web app: the status page offers *System* (follows the device, default), *Hell* and *Dunkel*. The choice is kept per device, applied before the first paint and, with *System*, follows the device while the app is open. PDFs and Excel files are not affected.

## 0.9.4 (2026-10-04)

* (alex) Invoice list: the period (quick choice, *Von*, *Bis*) sits in the same filter row as the other filters, with the labels above the two days.

## 0.9.3 (2026-10-04)

* (alex) Date range for the invoice list and the exports: quick choices (this/last month, quarter, year) or free *Von* / *Bis* days on the invoice date, both days included. Excel, CSV and DATEV use the same filter as the list and name the range in the file name (`rechnungen_2026-08-01_2026-08-31.csv`). `from` / `to` on the list and export routes. Fixed on the way: an export was cut at 500 invoices — it now contains everything that matches, in date order, and never a draft (a draft has no number to book).

## 0.9.2 (2026-10-04)

* (alex) Backup: the automatic backup is now **on by default** (daily) and keeps the newest 7 automatic backups (new setting *Automatic backups to keep*); only automatic backups are ever deleted, never those made by hand or the safety copies before a restore. The schedule counts from the last automatic backup, so a restart neither skips nor repeats one. The backup page and the new state `info.backupWarning` warn when there is no backup or it is old. Reason: an ioBroker backup (BackItUp) does not contain the invoice database `invoices.db` — it reaches the backup only through the adapter ZIP in `e-invoices.0.storage/backups/`. README compares BackItUp and the adapter backup. Instances installed earlier keep their saved interval (0 = off), set it in the instance settings.
