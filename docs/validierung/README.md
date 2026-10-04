# Nachweis: EN 16931 (CII) und PDF/A-3b

Stand **30.09.2026 (abends)**. Beleg zu Roadmap-Punkt **R2 (Konformitätsnachweis)**: Die
erzeugten Rechnungen werden mit **zwei unabhängigen Werkzeugen** geprüft — das CII-XML gegen
die EN-16931-Regeln, das Hybrid-PDF gegen das Profil PDF/A-3b. Der **Altbestand** des
dev-servers ist inzwischen auf den korrigierten Rendering-Stand gezogen und geprüft wurden
dabei die **ausgelieferten** Artefakte (Downloads der API, nicht nur die Dateien im Store).

## Ergebnis

| Belegsatz | CII-XML (KoSIT Validator 1.6.3) | Hybrid-PDF (veraPDF 1.30.2) |
| --- | --- | --- |
| Fünf Musterfälle (frisch erzeugt 30.09.2026) | **5/5 konform** (`rep:accept`, 0 Fehler) | **5/5 PASS** für Flavour `3b` |
| Bestand dev-server, 16 Rechnungen | **16/16 konform** (`rep:accept`, 0 Fehler) | **15/16 PASS** — 15 Belege wurden am 30.09.2026 auf den PDF/A-3b-Stand gerendert; offen bleibt nur der **stornierte** `2026-01-007` (eingefroren, s. u.) |
| Reparatur-Beleg: 13 archivierte `*.orig-1.pdf` (Altstand 28./29.09., vor dem Fix) | nicht geprüft (Altstand) | **0/13 PASS** — dokumentiert genau den behobenen Mangel |

Bewertet werden die **ausgelieferten** Artefakte: Die 16 PDFs kamen über
`GET /api/invoices/:id.pdf` und sind **byte-identisch** mit den Dateien im Store (16/16
gleicher SHA-256), die XMLs wurden zusätzlich über `GET /api/invoices/:id.xml` geprüft
(15/16 byte-identisch mit den Store-XMLs; die Ausnahme `2026-0001` ist dort ein älterer
Stand desselben Generators — ebenfalls `rep:accept`).

`musterfaelle/` enthält die frisch erzeugten Belege mit ihren Berichten, der Wurzelordner
den Lauf über den Belegbestand (`2026-*-report.xml`, `alle-belege.verapdf-3b.txt`).

## Automatischer Lauf (M6)

Der manuelle Nachweis ist automatisiert, damit eine Änderung am XML- oder PDF-Code nicht unbemerkt nicht-konforme Belege erzeugt:

- **`npm run validate`** (nach `npm run build`): startet den End-to-End-Server auf einem Wegwerf-Datenverzeichnis, lässt
  `musterfaelle.mjs` die sieben Musterfälle ausstellen und prüft jedes XML mit dem KoSIT-Validator 1.6.3 (EN 16931, CII). Die
  Werkzeuge werden beim ersten Lauf nach `.validation-tools/` geladen und gegen die oben genannten **SHA-256-Prüfsummen** geprüft
  (vollständig im Skript `test/validation/run.mjs`); Java muss im `PATH` liegen (oder `JAVA=` setzen). Ausgabe nach
  `.validation-out/` (XML, PDF, Berichte, `kosit.log`). Exit-Code 1, sobald ein Beleg abgelehnt wird.
- **Workflow `Validate invoices`** (`.github/workflows/validate-invoices.yml`): derselbe Lauf auf GitHub, dazu **veraPDF** (Docker-Image
  `verapdf/cli`, PDF/A-3b) für alle PDFs. Er startet monatlich, per Hand (`workflow_dispatch`) und bei Änderungen an `zugferd.ts`, `pdf.ts`,
  `pdf-attachments.ts`, `issue-service.ts`, `invoice-model.ts`, `templates.ts`, `fonts.ts` oder an den Musterfällen. Er gehört **nicht** zum
  Release-Workflow: ein roter Lauf ist ein Hinweis, die Dateien anzusehen (Artefakt `validation-files`), kein gesperrtes Release.
- Lokal bestätigt am 04.10.2026: 7 von 7 akzeptiert. Der veraPDF-Schritt im Workflow wurde noch nicht auf GitHub ausgeführt.

## Werkzeuge (Version, Bezug, Prüfsumme)

| Werkzeug | Version | Bezug | SHA-256 |
| --- | --- | --- | --- |
| KoSIT Validator (standalone) | 1.6.3 | `github.com/itplr-kosit/validator/releases/download/v1.6.3/validator-1.6.3-standalone.jar` | `799e64be…a7c9` |
| KoSIT-Konfiguration „EN16931 (CII)" | 2026-08-31 (XRechnung 3.0.2, darin CEN-Regeln 1.3.16) | `github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip` | `2530cd10…21a8` |
| CEN EN 16931 Validation Artefacts (CII) | 1.3.16 (2026-04-13) | `github.com/ConnectingEurope/eInvoicing-EN16931/releases/download/validation-1.3.16/en16931-cii-1.3.16.zip` | `1cd53cb8…c561` |
| veraPDF (Packs `veraPDF CLI` + `veraPDF GUI`) | 1.30.2 | `software.verapdf.org/releases/` (`verapdf-installer.zip`) | `6cc6341c…d838` |
| Temurin JRE (portabel, ohne Admin) | 21.0.12.1+1 | `api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse` | `d35f31e7…1636` |

Der veraPDF-Installer ist ein IzPack-Jar; lauffähig ist erst die **Vereinigung der Packs
`veraPDF CLI` und `veraPDF GUI`** (die Foundry-Registrierung sitzt im GUI-Pack), gestartet
über die offizielle `Main-Class`:

```shell
java -cp verapdf-all.jar org.verapdf.apps.GreenfieldCliWrapper -f 3b --format text <datei>.pdf
```

## Vorgehen

```shell
# 0) Bestand auf den aktuellen Rendering-Stand ziehen (erzeugt PDF **und** XML neu und legt
#    die Vorgängerdatei als <name>.orig-N.pdf ab; nur für Belege im Status "issued")
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -d '{"reason": "PDF/A-3b nachziehen"}' http://127.0.0.1:8093/api/invoices/<uuid>/rerender

# 0b) die *ausgelieferten* Artefakte holen und diese prüfen (UUID, nicht die Nummer!)
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8093/api/invoices/<uuid>.xml -o <ziel>.xml
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8093/api/invoices/<uuid>.pdf -o <ziel>.pdf

# 1) Musterfälle erzeugen (echter API-Stack, throwaway-Datenverzeichnis)
$env:E2E_PORT = '8099'; $env:E2E_DATA = '<data-dir>'
node test/e2e/server.mjs
node docs/validierung/musterfaelle.mjs docs/validierung/musterfaelle

# 2) XML gegen EN 16931 (nur das Szenario "EN16931 (CII)", also ohne XRechnung-CIUS)
java -jar validator-1.6.3-standalone.jar -s <config>/scenarios.xml -r <config> -o <ziel> -p <dateien>.xml

# 3) PDF gegen PDF/A-3b
java -cp verapdf-all.jar org.verapdf.apps.GreenfieldCliWrapper -f 3b --format text <dateien>.pdf
```

Für den Bestand laufen dieselben Schritte über
`…\.dev-server\default\iobroker-data\files\e-invoices.0.storage\invoices\2026\`; die Ablage
enthält genau die Dateien, die auch ausgeliefert werden (16/16 PDF- und 15/16 XML-Hash
gleich), zusätzlich wurden die Downloads aus den API-Routen direkt geprüft. Belege sind
**nur per UUID** adressierbar — die Nummer im Pfad liefert `404` (vgl.
`PROJECT_STATUS.md` §5 ⑤b); `GET /api/invoices` liefert die Liste mit IDs.
Bewertet wird `rep:accept`/`rep:reject` und der `failed-assert`-Zähler im VARL-Bericht,
bei veraPDF das `PASS`/`FAIL` der Textausgabe.

## Musterfälle (frisch erzeugt 30.09.2026, Nachlauf 04.10.2026)

**Nachlauf 04.10.2026 auf dem Stand 0.8.8** (Schema v15: Anlagen, Angebote, eingefrorenes Layout, Firmenbindung, Mahnwesen): sieben Fälle über den echten API-Stack neu erzeugt (`musterfaelle.mjs` kennt jetzt zusätzlich *Rechnung mit Anlage (BG-24)* und *Rechnung mit Skonto*), KoSIT-Validator 1.6.3 mit der Konfiguration „EN16931 (CII)“ (CEN 1.3.16): **7 von 7 akzeptabel, 0 Fehler** (`*-report.xml`, `kosit-en16931.log`); veraPDF 1.30.2, Profil PDF/A-3b: **7 von 7 PASS** (`verapdf-3b.txt`). Die Dateien in `musterfaelle/` sind die Läufe dieses Nachlaufs.

_Hinweis zum Aufruf:_ der KoSIT-Validator prüft beim Start, ob Daten über stdin kommen, und scheitert mit `Unzulässige Funktion`, wenn stdin kein Terminal und keine Pipe ist (z. B. `NUL` oder ein Hintergrundprozess). Aus einer Skript-Umgebung deshalb mit leerer Pipe starten: `type NUL | java -jar validator-1.6.3-standalone.jar …` (cmd).

| Fall | Rechnung | CII-XML | PDF/A-3b |
| --- | --- | --- | --- |
| Vollrechnung, 19 % + 7 %, Rabattzeile | 2026-00-001 | konform | PASS |
| Kleinbetrag 0,10 € netto (Rundung → 0,12 €) | 2026-00-002 | konform | PASS |
| Gutschrift (UNTDID 1001 = 381, Hinweis nach § 14 Abs. 4 UStG) | 2026-00-003 | konform | PASS |
| Reverse Charge (§ 13b UStG, Kategorie AE, 0 %) | 2026-00-004 | konform | PASS |
| Storno zur Rechnung 2026-00-005 | 2026-00-006 | konform | PASS |
| Rechnung mit Anlage (BG-24, eingebettetes PNG) — neu 04.10.2026 | 2026-00-007 | konform | PASS |
| Rechnung mit Skonto und Zahlungsziel — neu 04.10.2026 | 2026-00-008 | konform | PASS |

## Gefundene Punkte

- **`[BR-AE-02]` Reverse Charge — behoben am 30.09.2026.** Der erste Lauf des Falles
  „Reverse Charge" wurde abgelehnt: EN 16931 verlangt dort zusätzlich die **USt-IdNr. des
  Käufers (BT-48)** bzw. dessen Steuernummer, der Generator schrieb nur die
  Verkäufer-Kennungen. `src/lib/zugferd.ts` füllt jetzt `taxRegistrations` der
  Käufer-Party mit (`VA` aus `buyer.vatId`, `FC` aus `buyer.taxNumber`); Regressionstest
  `zugferd => reverse charge`. Danach 5/5 konform.
- **Altbestände vom 28./29.09.2026 — behoben am 30.09.2026.** Das Symptom: PDF/A-3b
  scheiterte an `ISO 19005-3:2012 §6.2.11.4.1` (Schriften nicht eingebettet: `Helvetica`,
  `Helvetica-Bold`) und `§6.2.4.3` (`DeviceRGB` ohne RGB-Output-Intent);
  Beispielbericht `_legacy-beispiel.2026-01-001.verapdf-3b.xml` (144 Regeln bestanden,
  2 fehlgeschlagen, 160 Checks) — Ursache war der Stand **vor** dem PDF/A-3b-Fix. Abhilfe
  ohne Datenverlust ist `POST /api/invoices/:id/rerender`, das Original wird dabei als
  `.orig-N.pdf` archiviert.
  **Lauf am 30.09.2026** (Build = 0.0.3 + PDF/A-Fix, `main` = `6d3568b`): 13 Requests für
  alle Belege mit Alt-PDF, davon **12 `200`** mit neu gerendertem PDF **und** XML; danach
  sind **15/15** ausgelieferte Belege PDF/A-3b-konform, die 13 archivierten `.orig-1.pdf`
  bleiben als Beleg `FAIL` (Beispiel: `2026-01-002.pdf` = PASS, dessen `.orig-1.pdf` = FAIL;
  neu gerenderte Belege `2026-01-012`, `2026-01-013` und alle fünf Musterfälle waren schon
  vorher konform). Vor dem Lauf wurden `storage` und `adapter-data` gesichert (14,99 MB,
  `%TEMP%\einvoice-backup-vor-rerender`).
  - **`2026-01-007` (storniert) — zurückgerollt.** Diesen Beleg lehnt der Endpunkt mit `400`
    ab: `attachIssueArtifacts` arbeitet nur bei Status `issued`, ein Storno bleibt per Design
    unverändert. Der Lauf hatte die Datei jedoch **vor** dieser Prüfung schon überschrieben;
    sie wurde deshalb byte-identisch aus der Sicherung zurückgespielt (Rollback per SHA-256
    verifiziert) und das dabei entstandene `.orig-1.pdf` entfernt. Der Beleg bleibt im
    Altstand und ist der **einzige** `FAIL` unter den ausgelieferten PDFs.
  - **Offen (klein): der Archivname ist fest verdrahtet.** `rerender` schreibt immer
    `<name>.orig-1.pdf`; ein zweiter Lauf für denselben Beleg überschreibt also das ältere
    Backup. Vorschlag: fortlaufende Nummer (`orig-N`) wie hier beschrieben.
  - **Offen (klein): XML-Ablage und Datenbank können auseinanderlaufen.** `rerender` erneuert
    das XML in der Datenbank (das ist die ausgelieferte Fassung), die Datei im Store bleibt
    aber stehen — bei `2026-0001` gemessen: Store-XML 4 451 B (ohne Käuferkontakt und
    Vorauszahlung), ausgeliefert 4 667 B; **beide** `rep:accept`. Da Backup/Restore die
    Store-Dateien bewegt, sollte `rerender` sie mitziehen.
- **Abschlag/Teilzahlung ist kein eigener Fall** — das Datenmodell kennt Skonto und
  Zahlungsstatus (`paid`), aber keine Abschlags-/Teilrechnung. Offen für R4/R6.

## Grenzen / Restrisiko

- Geprüft sind **Syntax (CII D16B)**, die **EN-16931-Regeln (CEN 1.3.16)** und das
  **PDF/A-3b-Profil**. Keine Aussage über Satz/Lesbarkeit des PDF — dafür stehen die
  Struktur-Checks und Musterprüfungen der E2E-Suite.
- Das Konfigurationspaket bringt auch die XRechnung-CIUS-Szenarien mit; ausgeführt wird
  bewusst nur **„EN16931 (CII)"** (Factur-X ist keine XRechnung).
- Regelstand ist CEN 1.3.16 (2026-04-13). Ein neues CEN- oder Factur-X-Release verlangt
  einen erneuten Lauf mit dem dann gültigen Konfigurationspaket.
- Das Ergebnis gilt für den **geprüften Stand**: `alle-belege.verapdf-3b.txt` nennt die
  geprüften Pfade. Werden Belege danach erneut gerendert, ist der Lauf zu wiederholen
  (Rerender ersetzt die Datei und legt dafür `.orig-1.pdf` an).
