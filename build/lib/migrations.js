"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var migrations_exports = {};
__export(migrations_exports, {
  LATEST_SCHEMA_VERSION: () => LATEST_SCHEMA_VERSION,
  MIGRATIONS: () => MIGRATIONS
});
module.exports = __toCommonJS(migrations_exports);
const MIGRATIONS = [
  {
    version: 1,
    name: "initial-schema",
    sql: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at TEXT NOT NULL
			)`,
      `CREATE TABLE IF NOT EXISTS invoices (
				id TEXT PRIMARY KEY,
				number TEXT UNIQUE,
				issue_date TEXT NOT NULL,
				delivery_date TEXT NOT NULL,
				due_date TEXT,
				seller_json TEXT NOT NULL,
				buyer_json TEXT NOT NULL,
				lines_json TEXT NOT NULL,
				totals_json TEXT NOT NULL,
				profile TEXT NOT NULL DEFAULT 'EN16931',
				status TEXT NOT NULL DEFAULT 'draft',
				template_id TEXT,
				document_title TEXT NOT NULL DEFAULT 'Rechnung',
				notes TEXT,
				xml TEXT,
				pdf_path TEXT,
				xlsx_path TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date)`,
      `CREATE TABLE IF NOT EXISTS counters (
				year INTEGER PRIMARY KEY,
				last_seq INTEGER NOT NULL DEFAULT 0
			)`,
      `CREATE TABLE IF NOT EXISTS attachments (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
				filename TEXT NOT NULL,
				mime TEXT NOT NULL,
				size INTEGER NOT NULL,
				data BLOB NOT NULL,
				created_at TEXT NOT NULL
			)`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_invoice ON attachments(invoice_id)`,
      `CREATE TABLE IF NOT EXISTS company_profiles (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				profile_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`,
      `CREATE TABLE IF NOT EXISTS templates (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				version INTEGER NOT NULL DEFAULT 1,
				definition_json TEXT NOT NULL,
				is_default INTEGER NOT NULL DEFAULT 0,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`,
      `CREATE TABLE IF NOT EXISTS backups (
				id TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				filename TEXT NOT NULL,
				size INTEGER NOT NULL,
				sha256 TEXT NOT NULL,
				manifest_json TEXT NOT NULL
			)`
    ]
  },
  {
    version: 2,
    name: "payment-terms",
    sql: [`ALTER TABLE invoices ADD COLUMN payment_terms TEXT`]
  }
];
const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce((max, item) => Math.max(max, item.version), 0);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LATEST_SCHEMA_VERSION,
  MIGRATIONS
});
//# sourceMappingURL=migrations.js.map
