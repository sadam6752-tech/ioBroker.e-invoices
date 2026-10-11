# Performance (R7.6)

What users can expect from the adapter. The figures come from `test/perf/perf.ts` (not part of
the test suites; run it on purpose with `npx ts-node test/perf/perf.ts`) on a throw-away
in-memory database and an in-memory file store, so they show the adapter's own work and not
the disk of your system. Every figure is the median of several runs after the first warm-up.

**Measuring environment:** Intel Core i9-9900K 3.6 GHz, 64 GB RAM, Windows 11, Node 22,
04.10.2026. A Raspberry Pi or a small NAS will be several times slower — read the figures as
relative sizes, not as promises.

| Positions | Sight PDF | Pages | CII XML |
|---:|---:|---:|---:|
| 50 | 75 ms | 2 | 7 ms |
| 200 | 89 ms | 6 | 12 ms |
| 500 | 122 ms | 13 | 18 ms |

| Issue flow | Time |
|---|---:|
| 5 positions: number + XML + hybrid PDF + Excel | 69 ms |
| 50 positions: number + XML + hybrid PDF + Excel | 78 ms |
| 200 positions: number + XML + hybrid PDF + Excel | 127 ms |

Seeding 5000 invoices (1000 with XML, PDF and Excel files): 64.13 s

| 5000 invoices | Time |
|---|---:|
| list, first page (50) | 5 ms |
| list, free-text search | 10 ms |
| list, sorted by amount | 6 ms |
| load all invoices (exports, reports) | 91 ms |
| open items evaluation (R6.2) | 116 ms |
| reminder candidates (dunning check) | 102 ms |
| backup ZIP (35.5 MB, 3000 files) | 3.24 s |
| restore of that backup | 1.30 s |

## Reading the figures

- **One invoice is cheap.** Issuing — number, CII XML, hybrid PDF/A-3 and Excel copy — takes
  around a tenth of a second, also with 200 positions. A 500-position invoice renders in
  about 0.13 s (13 pages).
- **Lists stay instant with 5 000 invoices.** The first page, a free-text search and the sort by
  amount answer in 5–11 ms; the list is paged in the database, never loaded as a whole.
- **Reports and exports read everything.** CSV/Excel/DATEV exports, the open-items list, the
  revenue per company and the dunning check load all invoices once: about 0.1 s at 5 000 invoices.
- **Backup is the long one.** A backup of 5 000 invoices with 3 000 files (35 MB ZIP) takes about
  3 s, the restore about 1.3 s. It runs on a timer and never blocks the issuing of an invoice
  longer than that.
- **Found and fixed while measuring:** the dunning check searched the cancelled documents once per
  overdue invoice — quadratic, and it only saw the 50 newest. It is a single pass now.

## Limits that apply regardless of speed

The restore refuses a ZIP above 512 MB, one that would expand beyond 1 GB, one with more than
20 000 entries and a `dump.json` above 256 MB (protection against crafted files, R3).
A backup of attachments grows by about one third (base64 in the dump). Keep an eye on the size
if you attach large files to many invoices.
