# Nachweis: EN 16931 (CII) und PDF/A-3b

Stand **30.09.2026**. Beleg zu Roadmap-Punkt **R2 (Konformitätsnachweis)**: Die erzeugten
Rechnungen werden mit **zwei unabhängigen Werkzeugen** geprüft — das CII-XML gegen die
EN-16931-Regeln, das Hybrid-PDF gegen das Profil PDF/A-3b.

## Ergebnis

| Belegsatz | CII-XML (KoSIT Validator 1.6.3) | Hybrid-PDF (veraPDF 1.30.2) |
| --- | --- | --- |
| Fünf Musterfälle (frisch erzeugt 30.09.2026) | **5/5 konform** (`rep:accept`, 0 Fehler) | **5/5 PASS** für Flavour `3b` |
| Bestand dev-server (16 Rechnungen, 17 PDFs) | **16/16 konform** (`rep:accept`, 0 Fehler) | **3/17 konform** (14 Altbestände, s. u.) |

`musterfaelle/` enthält die frisch erzeugten Belege mit ihren Berichten, der Wurzelordner
den Lauf über den Belegbestand (`2026-*-report.xml`, `alle-belege.verapdf-3b.txt`).

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
`…\.dev-server\default\iobroker-data\files\e-invoices.0.storage\invoices\2026\`.
Bewertet wird `rep:accept`/`rep:reject` und der `failed-assert`-Zähler im VARL-Bericht,
bei veraPDF das `PASS`/`FAIL` der Textausgabe.

## Musterfälle (frisch erzeugt 30.09.2026)

| Fall | Rechnung | CII-XML | PDF/A-3b |
| --- | --- | --- | --- |
| Vollrechnung, 19 % + 7 %, Rabattzeile | 2026-00-001 | konform | PASS |
| Kleinbetrag 0,10 € netto (Rundung → 0,12 €) | 2026-00-002 | konform | PASS |
| Gutschrift (UNTDID 1001 = 381, Hinweis nach § 14 Abs. 4 UStG) | 2026-00-003 | konform | PASS |
| Reverse Charge (§ 13b UStG, Kategorie AE, 0 %) | 2026-00-004 | konform | PASS |
| Storno zur Rechnung 2026-00-005 | 2026-00-006 | konform | PASS |

## Gefundene Punkte

- **`[BR-AE-02]` Reverse Charge — behoben am 30.09.2026.** Der erste Lauf des Falles
  „Reverse Charge" wurde abgelehnt: EN 16931 verlangt dort zusätzlich die **USt-IdNr. des
  Käufers (BT-48)** bzw. dessen Steuernummer, der Generator schrieb nur die
  Verkäufer-Kennungen. `src/lib/zugferd.ts` füllt jetzt `taxRegistrations` der
  Käufer-Party mit (`VA` aus `buyer.vatId`, `FC` aus `buyer.taxNumber`); Regressionstest
  `zugferd => reverse charge`. Danach 5/5 konform.
- **Altbestände vom 28./29.09.2026 (14 PDFs) — offen.** PDF/A-3b scheitert an
  `ISO 19005-3:2012 §6.2.11.4.1` (Schriften nicht eingebettet: `Helvetica`,
  `Helvetica-Bold`) und `§6.2.4.3` (`DeviceRGB` ohne RGB-Output-Intent);
  Beispielbericht `_legacy-beispiel.2026-01-001.verapdf-3b.xml` (144 Regeln bestanden,
  2 fehlgeschlagen, 160 Checks). Ursache ist der Stand **vor** dem PDF/A-3b-Fix.
  Abhilfe ohne Datenverlust: `POST /api/invoices/:id/rerender` (archiviert das Original
  als `.orig-N.pdf`); Beleg: `2026-01-002.pdf` = PASS, dessen Alt-PDF `.orig-1.pdf` =
  FAIL. Neu gerenderte Belege sind konform (`2026-01-012`, `2026-01-013`, alle fünf
  Musterfälle).
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
