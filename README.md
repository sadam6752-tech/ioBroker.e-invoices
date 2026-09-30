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
- ZUGFeRD profiles BASIC and EN 16931, offline XSD validation
- Hybrid PDF plus standalone XML for every issued invoice
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

Open `http://<iobroker-host>:8093/` for the invoice dashboard, the
multi-step wizard (seller → buyer → lines → review), invoice details with
validation and downloads, layout templates with PDF preview, backups and a
status page.

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
a stored report, XML/PDF/XLSX downloads, templates with logo upload and PDF
preview, backups, restore). With an API token configured, every route except
`/api/health` requires an `Authorization: Bearer <token>` header.

## Security notes

- **Token:** set `authToken` in the instance configuration. Every API route except
  `/api/health` then requires `Authorization: Bearer <token>`; without a token the
  API trusts every client that can reach the port.
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
- **Restore limits:** a backup ZIP may be at most 512 MB and expand to at most
  1 GB (`dump.json` at most 256 MB); a crafted archive is rejected before it is
  unpacked. Entry paths, per-file checksums and the manifest are verified.
- **Where the PWA keeps the token:** in the browser profile's `localStorage`, so a
  reload does not ask again. It is only ever sent as an `Authorization` header to
  the adapter (never in a URL), but a script running on the same origin could read
  it — use a dedicated browser profile, and note that changing the token in the
  instance config takes effect after the adapter restart.
- **Backup files are not encrypted:** the ZIP contains the database, attachments
  and XML/PDF artifacts in plain text. Keep it on an encrypted volume or share.

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
### **WORK IN PROGRESS**

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
