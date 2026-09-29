/**
 * Versioned SQLite migrations for ioBroker.e-invoices (P1).
 *
 * Rule: never edit a released migration. Schema changes always add a new
 * migration with the next version number.
 */

/** Single schema migration step. */
export interface Migration {
	/** Monotonic schema version, starting at 1. */
	version: number;
	/** Short human-readable name. */
	name: string;
	/** SQL statements executed in order inside one transaction. */
	sql: string[];
}

/**
 * Initial schema (v1): invoices, counters, attachments, company profiles,
 * layout templates and backup log. Invoice `number` is nullable on purpose:
 * drafts have no number yet; it is assigned atomically at issue time.
 */
export const MIGRATIONS: Migration[] = [
	{
		version: 1,
		name: 'initial-schema',
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
			)`,
		],
	},
	{
		version: 2,
		name: 'payment-terms',
		sql: [`ALTER TABLE invoices ADD COLUMN payment_terms TEXT`],
	},
	{
		version: 3,
		name: 'employee-numbering-and-company-default',
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
			`ALTER TABLE company_profiles ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`,
		],
	},
	{
		version: 4,
		name: 'customers',
		sql: [
			`CREATE TABLE IF NOT EXISTS customers (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				profile_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)`,
		],
	},
	{
		version: 5,
		name: 'products',
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
			)`,
		],
	},
	{
		version: 6,
		name: 'payment-state-skonto-and-storno',
		sql: [
			`ALTER TABLE invoices ADD COLUMN paid INTEGER NOT NULL DEFAULT 0`,
			`ALTER TABLE invoices ADD COLUMN paid_at TEXT`,
			`ALTER TABLE invoices ADD COLUMN storno_of_id TEXT`,
			`ALTER TABLE invoices ADD COLUMN skonto_percent REAL NOT NULL DEFAULT 0`,
			`ALTER TABLE invoices ADD COLUMN skonto_due_date TEXT`,
			`CREATE INDEX IF NOT EXISTS idx_invoices_paid ON invoices(paid)`,
		],
	},
	{
		version: 7,
		name: 'customer-number-counter',
		sql: [
			`CREATE TABLE IF NOT EXISTS customer_counters (
				name TEXT NOT NULL PRIMARY KEY,
				last_seq INTEGER NOT NULL DEFAULT 0
			)`,
		],
	},
	{
		version: 8,
		name: 'render-history',
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
			`CREATE INDEX IF NOT EXISTS idx_render_history_invoice ON render_history(invoice_id)`,
		],
	},
];

/** Highest schema version defined. */
export const LATEST_SCHEMA_VERSION: number = MIGRATIONS.reduce((max, item) => Math.max(max, item.version), 0);
