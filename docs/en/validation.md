# Evidence: EN 16931 (CII) and PDF/A-3b

German original: [docs/de/validierung.md](../de/validierung.md). This English version is the one kept up to date.

State of **30 September 2026 (evening)**, extended on 4 and 6 October 2026. Evidence for roadmap item **R2
(conformity evidence)**: the invoices the adapter creates are checked with **two independent tools** — the CII XML
against the EN 16931 rules, the hybrid PDF against the PDF/A-3b profile. The **existing documents** of the
dev server were brought up to the corrected rendering state, and what was checked are the **delivered**
artifacts (downloads of the API, not just the files in the store).

The evidence files themselves (reports, XML, PDF) are in [`docs/validierung/`](../validierung/) — the directory
name is kept because the workflow, the validation script and the tests point to it. They are output of the
tools and stay as they are.

## Result

| Set of documents | CII XML (KoSIT validator 1.6.3) | Hybrid PDF (veraPDF 1.30.2) |
| --- | --- | --- |
| Five sample cases (freshly made 30 Sep 2026) | **5/5 conform** (`rep:accept`, 0 errors) | **5/5 PASS** for flavour `3b` |
| Stock of the dev server, 16 invoices | **16/16 conform** (`rep:accept`, 0 errors) | **15/16 PASS** — 15 documents were rendered to the PDF/A-3b state on 30 Sep 2026; only the **cancelled** `2026-01-007` remains open (frozen, see below) |
| Repair evidence: 13 archived `*.orig-1.pdf` (old state of 28/29 Sep, before the fix) | not checked (old state) | **0/13 PASS** — documents exactly the defect that was fixed |

What is judged are the **delivered** artifacts: the 16 PDFs came through `GET /api/invoices/:id.pdf` and are
**byte-identical** to the files in the store (16/16 the same SHA-256); the XMLs were additionally checked through
`GET /api/invoices/:id.xml` (15/16 byte-identical to the store XMLs; the exception `2026-0001` is an older state of
the same generator there — also `rep:accept`).

`musterfaelle/` holds the freshly made documents with their reports, the root folder the run over the stock
(`2026-*-report.xml`, `alle-belege.verapdf-3b.txt`).

## Automatic run (M6)

The manual evidence is automated, so a change in the XML or PDF code cannot produce non-conforming documents
unnoticed:

- **`npm run validate`** (after `npm run build`): starts the end-to-end server on a throw-away data directory, lets
  `musterfaelle.mjs` issue the sample cases (13 since 6 October 2026: the ZUGFeRD cases, an XRechnung for every
  document title, an XRechnung with an attachment, a reversal of an XRechnung, and the refusal without Leitweg-ID)
  and checks every XML with the KoSIT validator 1.6.3 (scenarios EN 16931 (CII) and EN 16931 XRechnung (CII),
  chosen by the validator from the identifier in the XML). The tools are downloaded to `.validation-tools/` on
  the first run and checked against the **SHA-256 checksums** named below (complete in the script
  `test/validation/run.mjs`); Java has to be on the `PATH` (or set `JAVA=`). Output goes to `.validation-out/`
  (XML, PDF, reports, `kosit.log`). Exit code 1 as soon as a document is rejected **or carries a warning** (a rule
  that says "should", e.g. BR-DE-17, counts as a finding too).
- **Workflow `Validate invoices`** (`.github/workflows/validate-invoices.yml`): the same run on GitHub, plus
  **veraPDF** (Docker image `verapdf/cli`, PDF/A-3b) for the PDFs of the ZUGFeRD cases. It starts monthly, by hand
  (`workflow_dispatch`) and on changes to `zugferd.ts`, `pdf.ts`, `pdf-attachments.ts`, `issue-service.ts`,
  `invoice-model.ts`, `templates.ts`, `fonts.ts` or to the sample cases. It is **not** part of the release
  workflow: a red run is a hint to look at the files (artifact `validation-files`), not a blocked release.
- Confirmed locally on 8 October 2026: 13 of 13 accepted, without warnings.

## Tools (version, source, checksum)

| Tool | Version | Source | SHA-256 |
| --- | --- | --- | --- |
| KoSIT validator (standalone) | 1.6.3 | `github.com/itplr-kosit/validator/releases/download/v1.6.3/validator-1.6.3-standalone.jar` | `799e64be…a7c9` |
| KoSIT configuration "EN16931 (CII)" | 2026-08-31 (XRechnung 3.0.2, containing the CEN rules 1.3.16) | `github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip` | `2530cd10…21a8` |
| CEN EN 16931 validation artefacts (CII) | 1.3.16 (2026-04-13) | `github.com/ConnectingEurope/eInvoicing-EN16931/releases/download/validation-1.3.16/en16931-cii-1.3.16.zip` | `1cd53cb8…c561` |
| veraPDF (packs `veraPDF CLI` + `veraPDF GUI`) | 1.30.2 | `software.verapdf.org/releases/` (`verapdf-installer.zip`) | `6cc6341c…d838` |
| Temurin JRE (portable, no admin rights) | 21.0.12.1+1 | `api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse` | `d35f31e7…1636` |

The veraPDF installer is an IzPack jar; it only runs as the **union of the packs `veraPDF CLI` and `veraPDF GUI`**
(the foundry registration sits in the GUI pack), started through the official `Main-Class`:

```shell
java -cp verapdf-all.jar org.verapdf.apps.GreenfieldCliWrapper -f 3b --format text <file>.pdf
```

## Procedure

```shell
# 0) bring the stock up to the current rendering state (makes PDF **and** XML again and keeps the
#    previous file as <name>.orig-N.pdf; only for documents in the status "issued")
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -d '{"reason": "bring PDF/A-3b up to date"}' http://127.0.0.1:8093/api/invoices/<uuid>/rerender

# 0b) fetch the *delivered* artifacts and check those (UUID, not the number!)
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8093/api/invoices/<uuid>.xml -o <target>.xml
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8093/api/invoices/<uuid>.pdf -o <target>.pdf

# 1) make the sample cases (real API stack, throw-away data directory)
$env:E2E_PORT = '8099'; $env:E2E_DATA = '<data-dir>'
node test/e2e/server.mjs
node docs/validierung/musterfaelle.mjs docs/validierung/musterfaelle

# 2) XML against EN 16931 (scenario "EN16931 (CII)" for ZUGFeRD, "EN16931 XRechnung (CII)" for XRechnung)
java -jar validator-1.6.3-standalone.jar -s <config>/scenarios.xml -r <config> -o <target> -p <files>.xml

# 3) PDF against PDF/A-3b
java -cp verapdf-all.jar org.verapdf.apps.GreenfieldCliWrapper -f 3b --format text <files>.pdf
```

For the stock the same steps run over `…\.dev-server\default\iobroker-data\files\e-invoices.0.storage\invoices\2026\`;
the store holds exactly the files that are delivered (16/16 PDF and 15/16 XML hashes equal), and the downloads
from the API routes were checked directly as well. Documents can be addressed **by UUID only** — the number in the
path answers `404`; `GET /api/invoices` returns the list with the ids. What is judged is `rep:accept`/`rep:reject`
and the warnings of the report; for veraPDF the `PASS`/`FAIL` of the text output.

_Note on the call:_ the KoSIT validator checks at start whether data arrives on stdin and fails with
`Unzulässige Funktion` ("illegal function") if stdin is neither a terminal nor a pipe (e.g. `NUL` or a background
process). From a script environment start it with an empty pipe: `type NUL | java -jar validator-1.6.3-standalone.jar …`
(cmd).

## Sample cases (freshly made 30 Sep 2026, rerun 4 Oct 2026)

**Rerun on 4 October 2026 at state 0.8.8** (schema v15: attachments, quotations, frozen layout, company binding,
dunning): seven cases made again over the real API stack (`musterfaelle.mjs` additionally knows *invoice with
attachment (BG-24)* and *invoice with cash discount*), KoSIT validator 1.6.3 with the configuration "EN16931 (CII)"
(CEN 1.3.16): **7 of 7 acceptable, 0 errors** (`*-report.xml`, `kosit-en16931.log`); veraPDF 1.30.2, profile
PDF/A-3b: **7 of 7 PASS** (`verapdf-3b.txt`). The files in `musterfaelle/` are the runs of that rerun.

| Case | Invoice | CII XML | PDF/A-3b |
| --- | --- | --- | --- |
| Full invoice, 19 % + 7 %, discount line | 2026-00-001 | conform | PASS |
| Small amount 0.10 EUR net (rounding → 0.12 EUR) | 2026-00-002 | conform | PASS |
| Credit note (UNTDID 1001 = 381, note under § 14 (4) UStG) | 2026-00-003 | conform | PASS |
| Reverse charge (§ 13b UStG, category AE, 0 %) | 2026-00-004 | conform | PASS |
| Reversal (Storno) of invoice 2026-00-005 | 2026-00-006 | conform | PASS |
| Invoice with attachment (BG-24, embedded PNG) — new 4 Oct 2026 | 2026-00-007 | conform | PASS |
| Invoice with cash discount and payment term — new 4 Oct 2026 | 2026-00-008 | conform | PASS |

## Findings

- **`[BR-AE-02]` reverse charge — fixed on 30 Sep 2026.** The first run of the "reverse charge" case was rejected:
  EN 16931 additionally asks for the **VAT ID of the buyer (BT-48)** or its tax number there, the generator wrote only
  the seller's identifiers. `src/lib/zugferd.ts` now fills `taxRegistrations` of the buyer party as well (`VA` from
  `buyer.vatId`, `FC` from `buyer.taxNumber`); regression test `zugferd => reverse charge`. After that 5/5 conform.
- **Old documents of 28/29 Sep 2026 — fixed on 30 Sep 2026.** The symptom: PDF/A-3b failed at
  `ISO 19005-3:2012 §6.2.11.4.1` (fonts not embedded: `Helvetica`, `Helvetica-Bold`) and `§6.2.4.3` (`DeviceRGB`
  without an RGB output intent); example report `_legacy-beispiel.2026-01-001.verapdf-3b.xml` (144 rules passed, 2
  failed, 160 checks) — the cause was the state **before** the PDF/A-3b fix. The remedy without loss of data is
  `POST /api/invoices/:id/rerender`, which archives the original as `.orig-N.pdf`.
  **Run of 30 Sep 2026** (build = 0.0.3 + PDF/A fix, `main` = `6d3568b`): 13 requests for all documents with an old
  PDF, of which **12 `200`** with newly rendered PDF **and** XML; afterwards **15/15** delivered documents are
  PDF/A-3b conform, the 13 archived `.orig-1.pdf` stay as evidence `FAIL` (example: `2026-01-002.pdf` = PASS, its
  `.orig-1.pdf` = FAIL; the newly rendered documents `2026-01-012`, `2026-01-013` and all five sample cases were
  conform before). Before the run `storage` and `adapter-data` were saved (14.99 MB).
  - **`2026-01-007` (cancelled) — rolled back.** The endpoint refuses this document with `400`:
    `attachIssueArtifacts` works only for the status `issued`, a Storno stays unchanged by design. The run had
    overwritten the file **before** that check, though; it was therefore restored byte-identically from the backup
    (rollback verified by SHA-256) and the `.orig-1.pdf` that had come into being was removed. The document stays
    in the old state and is the **only** `FAIL` among the delivered PDFs.
  - **Open (small): the archive name is hard-wired.** At the time `rerender` always wrote `<name>.orig-1.pdf`, so a
    second run overwrote the older backup. *Solved since:* every re-render keeps its own archive step
    (`orig-1`, `orig-2`, …) and never overwrites one.
  - **Open (small): XML store and database can drift apart.** `rerender` renews the XML in the database (that is the
    delivered version), the file in the store stays — measured with `2026-0001`: store XML 4,451 B (without buyer
    contact and prepayment), delivered 4,667 B; **both** `rep:accept`. *Solved since:* the XML is the leading
    document and is never regenerated; a re-render embeds the stored XML unchanged.
- **Part invoice / instalment is no case of its own** — the data model knows cash discount and payment state
  (`paid`), but no part invoice at that time.

## XRechnung (R6.1, 6 Oct 2026)

Additional sample cases with the format `XRECHNUNG` (B2G): `xrechnung-b2g` (two tax rates, Leitweg-ID as BT-10),
`xrechnung-mit-anlage-bg24` (an attachment as BG-24 in the XML), and since 8 October 2026 one for each document
title (`xrechnung-abschlagsrechnung`, `-schlussrechnung`, `-gutschrift`) and a reversal (`xrechnung-storno`). All go
through the real API stack (`npm run validate`); the XML of the first two is in `musterfaelle/`, the report next to it.

- KoSIT validator 1.6.3, configuration XRechnung 3.0.2 (2026-08-31): scenario **"EN16931 XRechnung (CII)"**, result
  `rep:accept`, no errors and no warnings. The first run with the title "Schlussrechnung" had produced a **warning**
  `BR-DE-17` (type code 218 is not in the list of the XRechnung); an XRechnung now carries 380 there.
- The PDFs of these cases are deliberately **not** part of the PDF/A-3b check: an XRechnung is plain XML, the PDF is a
  view without embedded XML. `musterfaelle.mjs` checks instead that the PDF contains neither `EmbeddedFile` nor
  `AFRelationship`.
- A document **without Leitweg-ID** is refused on issue (message with BR-DE-15), the draft stays a draft and no
  number is used up (tested in the same run).
- Not checked: acceptance by a concrete authority (portal, Peppol access point, own additional rules).

## Note on the paths in the reports

The validator reports name the checked file with its full path on the machine they were made on. Those paths (user
name, disk layout) are replaced by `[repo]`, `[temp]`, `[npm-cache]` and `[tools]`; nothing else in the reports is
changed. Whoever puts a new run here replaces the paths the same way — a test (`test/pwa.test.ts`, "no private
paths") fails when a drive path with `Users` in it stands in `docs/`.

## Limits / residual risk

- What is checked: **syntax (CII D16B)**, the **EN 16931 rules (CEN 1.3.16)** and the **PDF/A-3b profile**. No
  statement about the layout or readability of the PDF — the structure checks and spot checks of the E2E suite
  stand for that.
- The configuration package brings the XRechnung CIUS scenarios as well. The ZUGFeRD sample cases run in the
  scenario **"EN16931 (CII)"** (Factur-X is no XRechnung), the XRechnung cases in **"EN16931 XRechnung (CII)"**, which
  the validator chooses from the XRechnung identifier in the XML itself.
- The rules state is CEN 1.3.16 (2026-04-13). A new CEN or Factur-X release needs a new run with the then valid
  configuration package.
- The result holds for the **checked state**: `alle-belege.verapdf-3b.txt` names the checked paths. When documents
  are rendered again afterwards, the run has to be repeated (a re-render replaces the file and keeps the old one as
  `.orig-N.pdf`).
