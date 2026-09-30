# Contributing to ioBroker.e-invoices

## Development setup

Clone the repository, then fetch dependencies for the adapter and the PWA:

```bash
git clone https://github.com/sadam6752-tech/ioBroker.e-invoices.git
```

The adapter builds with `npm run build` (TypeScript plus the PWA bundle in
`www/`). Useful scripts: `npm run check` (type check), `npm run lint`,
`npm run test` (unit, API and package tests), `npm run dev-server` for a
local ioBroker to try the adapter.

## PWA sources

The frontend lives in `src-www/` (Vite + TypeScript, no framework) and is
excluded from the adapter lint. Build it with `npm run build:pwa`. Icons
are generated dependency-free via `src-www/scripts/make-icons.mjs`.

## Releases

Releases are published from version tags by the GitHub workflow (with npm
provenance). The checklist: update the `WORK IN PROGRESS` changelog,
`npm run version:bump -- patch|minor|major`, translate `common.news` into
all eleven languages, keep every check green, commit, push, tag
`v<version>` and push the tag.
