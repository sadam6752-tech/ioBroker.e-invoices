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
  },
  {
    version: 3,
    name: "employee-numbering-and-company-default",
    sql: [
      `CREATE TABLE counters_new (
				year INTEGER NOT NULL,
				employee TEXT NOT NULL DEFAULT '00',
				last_seq INTEGER NOT NULL DEFAULT '00',
				PRIMARY KEY (year, employee)
			)`,
      `INSERT INTO counters_new (year, employee, last_seq) SELECT year, '00', last_seq FROM counters`,
      `DROP TABLE counters`,
      `ALTER TABLE counters_new RENAME TO counters`,
      `ALTER TABLE invoices ADD COLUMN employee_code TEXT`,
      `ALTER TABLE company_profiles ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`
    ]
  },
  {
    version: 4,
    name: "customers",
    sql: [
      `CREATE TABLE IF NOT EXISTS customers (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				profile_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`
    ]
  },
  {
    version: 5,
    name: "products",
    sql: [
      `CREATE TABLE IF NOT EXISTS products (
				id TEXT PRIMARY KEY,
				sku TEXT NOT NULL DEFAULT '',
				name TEXT NOT NULL,
				details TEXT NOT NULL DEFAULT '',
				unit TEXT NOT NULL DEFAULT 'Stk',
				unit_price_net REAL NOT NULL DEFAULT 0,
				vat_rate REAL NOT NULL DEFAULT 19,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`
    ]
  },
  {
    version: 6,
    name: "payment-state-skonto-and-storno",
    sql: [
      `ALTER TABLE invoices ADD COLUMN paid INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN paid_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN storno_of_id TEXT`,
      `ALTER TABLE invoices ADD COLUMN skonto_percent REAL NOT NULL DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN skonto_due_date TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_paid ON invoices(paid)`
    ]
  },
  {
    version: 7,
    name: "customer-number-counter",
    sql: [
      `CREATE TABLE IF NOT EXISTS customer_counters (
				name TEXT NOT NULL PRIMARY KEY,
				last_seq INTEGER NOT NULL DEFAULT 0
			)`
    ]
  },
  {
    version: 8,
    name: "render-history",
    sql: [
      // GoBD: an issued document must stay reproducible. A re-render never
      // overwrites the delivered file silently, the previous artifact and
      // the reason are kept here.
      `CREATE TABLE IF NOT EXISTS render_history (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
				artifact TEXT NOT NULL,
				previous_path TEXT,
				new_path TEXT,
				reason TEXT,
				created_at TEXT NOT NULL
			)`,
      `CREATE INDEX IF NOT EXISTS idx_render_history_invoice ON render_history(invoice_id)`
    ]
  },
  {
    version: 9,
    name: "dispatch-and-organisation",
    sql: [
      // GoBD/VAT: proof that the invoice was handed over to the customer.
      `ALTER TABLE invoices ADD COLUMN sent_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN send_channel TEXT`,
      // § 16 Abs. 2 Nr. 2 UStG: the payment method has to be checked once an
      // invoice is overdue by more than 40 days or above 10.000 EUR.
      `ALTER TABLE invoices ADD COLUMN payment_check TEXT`,
      `ALTER TABLE invoices ADD COLUMN payment_checked_at TEXT`,
      // Reminder state for the dunning job.
      `ALTER TABLE invoices ADD COLUMN reminded_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN reminder_level INTEGER NOT NULL DEFAULT 0`,
      // § 147 AO / § 14b UStG: the earliest deletion date of the record.
      `ALTER TABLE invoices ADD COLUMN retain_until TEXT`
    ]
  },
  {
    version: 10,
    name: "invoice-templates",
    sql: [
      // Reusable draft content (recurring maintenance, flat fees, ...).
      `CREATE TABLE IF NOT EXISTS invoice_templates (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				body_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`
    ]
  },
  {
    version: 11,
    name: "validation-reports",
    sql: [
      // R2: the plausibility check of an e-invoice has to be reproducible.
      // Every run stores its report as a JSON file next to XML/PDF and is
      // listed here, so the detail view can link to the artifact.
      `CREATE TABLE IF NOT EXISTS validation_reports (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
				seq INTEGER NOT NULL,
				report_path TEXT NOT NULL,
				format_errors INTEGER NOT NULL,
				business_errors INTEGER NOT NULL,
				created_at TEXT NOT NULL
			)`,
      `CREATE INDEX IF NOT EXISTS idx_validation_reports_invoice ON validation_reports(invoice_id)`
    ]
  },
  {
    version: 12,
    name: "document-types-and-quotes",
    sql: [
      // R8: one document model, several document types. Everything that
      // already exists is an invoice, so the default keeps every legacy
      // record valid and untouched (Leitlinie 7).
      `ALTER TABLE invoices ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'invoice'`,
      // Quotation lifecycle: how long the offer stands and how it ended.
      `ALTER TABLE invoices ADD COLUMN valid_until TEXT`,
      `ALTER TABLE invoices ADD COLUMN accepted_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN rejected_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN rejection_reason TEXT`,
      // Document chain quotation -> invoice. `storno_of_id` stays free for
      // the reversal case, both references never mix.
      `ALTER TABLE invoices ADD COLUMN source_document_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(doc_type)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_source_document ON invoices(source_document_id)`,
      // Separate number circles, rebuilt exactly like v3 did it: the
      // existing rows keep their last_seq, so the invoice sequence stays
      // continuous (§ 14 Abs. 4 Nr. 4 UStG — no renumbering), while the
      // quotation circle starts at 1.
      `CREATE TABLE counters_new (
				year INTEGER NOT NULL,
				employee TEXT NOT NULL DEFAULT '00',
				doc_type TEXT NOT NULL DEFAULT 'invoice',
				last_seq INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (year, employee, doc_type)
			)`,
      `INSERT INTO counters_new (year, employee, doc_type, last_seq) SELECT year, employee, 'invoice', last_seq FROM counters`,
      `DROP TABLE counters`,
      `ALTER TABLE counters_new RENAME TO counters`
    ]
  },
  {
    version: 13,
    name: "template-snapshot",
    sql: [
      // R7.8: the layout an invoice was issued with, frozen with it. NULL for
      // everything issued before (those render with the current layout and are
      // marked as "not frozen" in the history).
      `ALTER TABLE invoices ADD COLUMN template_snapshot_json TEXT`,
      // Which layout a re-render used: issued, current, or current-unfrozen.
      `ALTER TABLE render_history ADD COLUMN layout TEXT`
    ]
  }
];
const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce((max, item) => Math.max(max, item.version), 0);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LATEST_SCHEMA_VERSION,
  MIGRATIONS
});
//# sourceMappingURL=migrations.js.map
