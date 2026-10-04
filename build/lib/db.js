"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var db_exports = {};
__export(db_exports, {
  InvoiceDatabase: () => InvoiceDatabase,
  levenshtein: () => levenshtein,
  rankCustomers: () => rankCustomers,
  retentionUntil: () => retentionUntil
});
module.exports = __toCommonJS(db_exports);
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_attachments = require("./attachments");
var import_invoice_model = require("./invoice-model");
var import_migrations = require("./migrations");
var import_dunning = require("./dunning");
var import_templates = require("./templates");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function normalizeForSearch(value) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
}
function levenshtein(a, b) {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
function customerScore(customer, needle) {
  var _a, _b;
  const haystacks = [
    customer.name,
    customer.profile.name,
    (_a = customer.profile.customerNumber) != null ? _a : "",
    (_b = customer.profile.city) != null ? _b : ""
  ].map(normalizeForSearch).filter(Boolean);
  if (!haystacks.length) {
    return 0;
  }
  let best = 0;
  for (const hay of haystacks) {
    if (hay === needle) {
      return 1e3;
    }
    if (hay.startsWith(needle)) {
      best = Math.max(best, 500 - hay.length);
    }
    if (hay.includes(needle)) {
      best = Math.max(best, 400 - hay.length);
    }
    const words = hay.split(" ");
    for (const word of words) {
      if (word.startsWith(needle)) {
        best = Math.max(best, 300 - word.length);
      }
      const tolerance = needle.length >= 5 ? 2 : needle.length >= 3 ? 1 : 0;
      if (tolerance > 0 && Math.abs(word.length - needle.length) <= tolerance && levenshtein(word, needle) <= tolerance) {
        best = Math.max(best, 200);
      }
    }
  }
  return best;
}
function rankCustomers(customers, query) {
  const needle = normalizeForSearch(query);
  if (!needle) {
    return customers;
  }
  return customers.map((c) => ({ c, score: customerScore(c, needle) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name, "de")).slice(0, 50).map((entry) => entry.c);
}
function retentionUntil(issueDate) {
  const year = Number((issueDate != null ? issueDate : "").slice(0, 4));
  if (!Number.isInteger(year) || year < 1990 || year > 2200) {
    return null;
  }
  return `${year + 10}-12-31`;
}
function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Corrupt ${label} JSON in database`);
  }
}
function mapRow(row) {
  var _a, _b, _c, _d;
  return {
    id: row.id,
    number: row.number,
    issueDate: row.issue_date,
    deliveryDate: row.delivery_date,
    dueDate: row.due_date,
    seller: parseJson(row.seller_json, "seller"),
    buyer: parseJson(row.buyer_json, "buyer"),
    lines: parseJson(row.lines_json, "lines"),
    totals: parseJson(row.totals_json, "totals"),
    profile: row.profile,
    status: row.status,
    docType: (0, import_invoice_model.normalizeDocumentType)(row.doc_type),
    templateId: row.template_id,
    templateSnapshot: row.template_snapshot_json ? parseJson(row.template_snapshot_json, "template snapshot") : null,
    documentTitle: row.document_title,
    notes: row.notes,
    employeeCode: (_a = row.employee_code) != null ? _a : null,
    paymentTerms: (_b = row.payment_terms) != null ? _b : null,
    xml: row.xml,
    pdfPath: row.pdf_path,
    xlsxPath: row.xlsx_path,
    paid: row.paid === 1,
    paidAt: row.paid_at,
    stornoOfId: row.storno_of_id,
    skontoPercent: (_c = row.skonto_percent) != null ? _c : 0,
    skontoDueDate: row.skonto_due_date,
    sentAt: row.sent_at,
    sendChannel: row.send_channel,
    paymentCheck: row.payment_check,
    paymentCheckedAt: row.payment_checked_at,
    remindedAt: row.reminded_at,
    reminderLevel: row.reminder_level,
    retainUntil: row.retain_until,
    validUntil: row.valid_until,
    sourceDocumentId: row.source_document_id,
    companyId: (_d = row.company_id) != null ? _d : null,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    definition: parseJson(row.definition_json, "template"),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapAttachment(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    data: row.data,
    createdAt: row.created_at
  };
}
function mapAttachmentMeta(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    createdAt: row.created_at
  };
}
function mapCompanyRow(row) {
  return {
    id: row.id,
    name: row.name,
    profile: parseJson(row.profile_json, "company"),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapCustomerRow(row) {
  return {
    id: row.id,
    name: row.name,
    profile: parseJson(row.profile_json, "customer"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapProductRow(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    details: row.details,
    unit: row.unit,
    unitPriceNet: row.unit_price_net,
    vatRate: row.vat_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function registerAmountMatcher(totalsJson, term) {
  const needle = String(term != null ? term : "").trim();
  const cleaned = needle.replace(/[€\s]/g, "").replace(/EUR|eur/g, "").trim();
  let digits;
  const grouped = /^(\d{1,3}(?:[.,]\d{3})+)([.,])(\d+)$/.exec(cleaned);
  if (grouped) {
    digits = `${grouped[1].replace(/[.,]/g, "")}.${grouped[3]}`;
  } else {
    digits = cleaned.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(digits)) {
    return 0;
  }
  const wanted = Number(digits);
  if (!Number.isFinite(wanted)) {
    return 0;
  }
  let totals;
  try {
    totals = JSON.parse(String(totalsJson != null ? totalsJson : "{}"));
  } catch {
    return 0;
  }
  const cent = Math.round(wanted * 100);
  const rounded = Number.isInteger(wanted);
  for (const value of [totals.grossTotal, totals.netTotal, totals.taxTotal]) {
    const stored = Math.round(Number(value) * 100);
    if (Number.isFinite(stored) && (stored === cent || rounded && Math.abs(stored - cent) < 100)) {
      return 1;
    }
  }
  return 0;
}
class InvoiceDatabase {
  db;
  /** Invoice number format from the instance config. */
  numberFormat = import_invoice_model.DEFAULT_NUMBER_FORMAT;
  /** Quotation number format from the instance config (own circle, R8). */
  quoteNumberFormat = import_invoice_model.DEFAULT_QUOTE_NUMBER_FORMAT;
  /**
   * Opens (and creates) the SQLite file.
   *
   * @param dbPath - Absolute path to `invoices.db`.
   */
  constructor(dbPath) {
    (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)(dbPath), { recursive: true });
    this.db = new import_better_sqlite3.default(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.db.function("amountMatches", { deterministic: true }, registerAmountMatcher);
  }
  /**
   * Applies the instance configuration that influences numbering.
   * An invalid format is rejected here so the adapter can warn once.
   *
   * @param options - Adapter options from the instance config.
   * @param options.numberFormat - Desired invoice number pattern.
   * @param options.quoteNumberFormat - Desired quotation number pattern.
   */
  applyOptions(options) {
    var _a, _b;
    this.numberFormat = (_a = options.numberFormat) != null ? _a : import_invoice_model.DEFAULT_NUMBER_FORMAT;
    this.quoteNumberFormat = (_b = options.quoteNumberFormat) != null ? _b : import_invoice_model.DEFAULT_QUOTE_NUMBER_FORMAT;
  }
  /**
   * The number format actually in use (falls back to the default when the
   * configured one was rejected).
   *
   * @returns A validated format string.
   */
  effectiveNumberFormat() {
    var _a;
    return (_a = (0, import_invoice_model.normalizeNumberFormat)(this.numberFormat)) != null ? _a : import_invoice_model.DEFAULT_NUMBER_FORMAT;
  }
  /**
   * Effective, validated quotation number format (own circle, R8).
   */
  effectiveQuoteNumberFormat() {
    var _a;
    return (_a = (0, import_invoice_model.normalizeNumberFormat)(this.quoteNumberFormat)) != null ? _a : import_invoice_model.DEFAULT_QUOTE_NUMBER_FORMAT;
  }
  /** Closes the database handle. */
  close() {
    this.db.close();
  }
  /**
   * Lists column names of a table (schema introspection for tests/migrations).
   *
   * @param table - Table name.
   */
  tableColumns(table) {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.map((row) => row.name);
  }
  /** Current applied schema version (0 when fresh). */
  currentVersion() {
    var _a;
    const row = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`).get();
    if (!row) {
      return 0;
    }
    const max = this.db.prepare(`SELECT MAX(version) AS v FROM schema_migrations`).get();
    return (_a = max.v) != null ? _a : 0;
  }
  /**
   * Applies all pending migrations in order, each in its own transaction.
   */
  migrate() {
    const current = this.currentVersion();
    for (const migration of import_migrations.MIGRATIONS) {
      if (migration.version <= current) {
        continue;
      }
      const apply = this.db.transaction(() => {
        for (const statement of migration.sql) {
          this.db.exec(statement);
        }
        this.db.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`).run(migration.version, migration.name, nowIso());
      });
      apply();
    }
    if (this.currentVersion() !== import_migrations.LATEST_SCHEMA_VERSION) {
      throw new Error("Migration did not reach latest schema version");
    }
  }
  /**
   * Reserves the next document number for a document type + year + employee
   * atomically (`YYYY-EE-NNN`, custom format honoured).
   *
   * Invoice and quotation circles are strictly separate (R8): issuing a
   * quotation never advances the invoice sequence and vice versa, so the
   * invoice numbering stays uninterrupted (§ 14 Abs. 4 Nr. 4 UStG).
   *
   * @param docType - Invoice (default) or quotation.
   * @param year - Calendar year, e.g. 2026.
   * @param employee - Employee code, defaults to `00`.
   */
  nextDocumentNumber(docType, year, employee) {
    var _a;
    if (!Number.isInteger(year) || year < 2e3 || year > 2100) {
      throw new Error(`Invalid year: ${year}`);
    }
    const kind = (0, import_invoice_model.normalizeDocumentType)(docType);
    const code = (0, import_invoice_model.normalizeEmployeeCode)(employee);
    const fallback = kind === "quote" ? import_invoice_model.DEFAULT_QUOTE_NUMBER_FORMAT : import_invoice_model.DEFAULT_NUMBER_FORMAT;
    const format = (_a = (0, import_invoice_model.normalizeNumberFormat)(kind === "quote" ? this.quoteNumberFormat : this.numberFormat)) != null ? _a : fallback;
    const run = this.db.transaction(() => {
      var _a2;
      const row = this.db.prepare(`SELECT last_seq AS seq FROM counters WHERE year = ? AND employee = ? AND doc_type = ?`).get(year, code, kind);
      const next = ((_a2 = row == null ? void 0 : row.seq) != null ? _a2 : 0) + 1;
      this.db.prepare(
        `INSERT INTO counters (year, employee, doc_type, last_seq) VALUES (?, ?, ?, ?)
					ON CONFLICT(year, employee, doc_type) DO UPDATE SET last_seq = excluded.last_seq`
      ).run(year, code, kind, next);
      if (kind === "quote") {
        return (0, import_invoice_model.renderInvoiceNumber)(format, { year, employee: code, seq: next });
      }
      return format === import_invoice_model.DEFAULT_NUMBER_FORMAT ? (0, import_invoice_model.formatInvoiceNumber)(year, code, next) : (0, import_invoice_model.renderInvoiceNumber)(format, { year, employee: code, seq: next });
    });
    return run();
  }
  /**
   * Next invoice number (`YYYY-EE-NNN`).
   *
   * @param year - Calendar year.
   * @param employee - Employee code, defaults to `00`.
   */
  nextInvoiceNumber(year, employee) {
    return this.nextDocumentNumber("invoice", year, employee);
  }
  /**
   * Next quotation number (`A-YYYY-EE-NNN` by default, own circle).
   *
   * @param year - Calendar year.
   * @param employee - Employee code, defaults to `00`.
   */
  nextQuoteNumber(year, employee) {
    return this.nextDocumentNumber("quote", year, employee);
  }
  /**
   * Creates a new draft (may be incomplete; validation happens at issue).
   *
   * @param input - Draft content; `docType` decides invoice vs. quotation.
   */
  createDraft(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const kind = (0, import_invoice_model.normalizeDocumentType)(input.docType);
    const totals = (0, import_invoice_model.calcTotals)(input.lines.length > 0 ? input.lines : []);
    const companyId = this.checkedCompanyId(input.companyId);
    this.db.prepare(
      `INSERT INTO invoices
				(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json, profile, status, doc_type, template_id, document_title, notes, payment_terms, employee_code, skonto_percent, skonto_due_date, valid_until, source_document_id, company_id, created_at, updated_at)
				VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'EN16931', 'draft', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.issueDate,
      input.deliveryDate,
      (_a = input.dueDate) != null ? _a : null,
      JSON.stringify(input.seller),
      JSON.stringify(input.buyer),
      JSON.stringify(input.lines),
      JSON.stringify(totals),
      kind,
      ((_b = input.documentTitle) == null ? void 0 : _b.trim()) || (0, import_invoice_model.defaultDocumentTitle)(kind),
      (_c = input.notes) != null ? _c : null,
      (_d = input.paymentTerms) != null ? _d : null,
      ((_e = input.employeeCode) == null ? void 0 : _e.trim()) ? (0, import_invoice_model.normalizeEmployeeCode)(input.employeeCode) : null,
      Number(input.skontoPercent) || 0,
      ((_f = input.skontoDueDate) == null ? void 0 : _f.trim()) || null,
      ((_g = input.validUntil) == null ? void 0 : _g.trim()) || null,
      (_h = input.sourceDocumentId) != null ? _h : null,
      companyId,
      stamp,
      stamp
    );
    const created = this.getInvoice(id);
    if (!created) {
      throw new Error("Draft was not stored");
    }
    return created;
  }
  /**
   * Normalises the company a document is bound to (R6.3).
   *
   * @param value - Company profile id, empty or null for "none".
   * @returns The id, or null when none was given.
   * @throws {Error} When the profile does not exist.
   */
  checkedCompanyId(value) {
    const id = typeof value === "string" ? value.trim() : "";
    if (!id) {
      return null;
    }
    if (!this.getCompanyProfile(id)) {
      throw new Error(`Unknown company profile: ${id}`);
    }
    return id;
  }
  /**
   * Loads one invoice by id.
   *
   * @param id - Invoice UUID.
   */
  getInvoice(id) {
    const row = this.db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id);
    return row ? mapRow(row) : null;
  }
  /**
   * Lists invoices newest first with optional filters.
   *
   * @param filter - Status/year/search/pagination filter.
   */
  listInvoices(filter = {}) {
    var _a, _b;
    const where = [];
    const params = [];
    if (filter.docType) {
      where.push(`doc_type = ?`);
      params.push((0, import_invoice_model.normalizeDocumentType)(filter.docType));
    }
    if (filter.sourceDocumentId) {
      where.push(`source_document_id = ?`);
      params.push(filter.sourceDocumentId);
    }
    if (filter.companyId === "none") {
      where.push(`company_id IS NULL`);
    } else if (filter.companyId) {
      where.push(`company_id = ?`);
      params.push(filter.companyId);
    }
    if (filter.status) {
      where.push(`status = ?`);
      params.push(filter.status);
    }
    if (filter.year) {
      where.push(`substr(issue_date, 1, 4) = ?`);
      params.push(String(filter.year));
    }
    if (filter.query) {
      where.push(
        `(number LIKE ? OR buyer_json LIKE ? OR seller_json LIKE ? OR lines_json LIKE ? OR notes LIKE ? OR amountMatches(totals_json, ?))`
      );
      const like = `%${filter.query}%`;
      params.push(like, like, like, like, like, filter.query);
    }
    if (filter.sent === true) {
      where.push(`sent_at IS NOT NULL`);
    } else if (filter.sent === false) {
      where.push(`sent_at IS NULL`);
    }
    const rawLimit = Number(filter.limit);
    const rawOffset = Number(filter.offset);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 500) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
    const sortColumns = {
      date: "issue_date",
      // single quotes: SQLite wants them around the JSON path, and the
      // value is already numeric, so ordering is a plain numeric compare
      amount: `json_extract(totals_json, '$.grossTotal')`,
      customer: "buyer_json",
      number: "number",
      due: "due_date",
      status: "status"
    };
    const column = (_b = sortColumns[(_a = filter.sort) != null ? _a : "date"]) != null ? _b : "issue_date";
    const direction = filter.order === "asc" ? "ASC" : "DESC";
    const rows = this.db.prepare(
      `SELECT * FROM invoices ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${column} ${direction}, id DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);
    return rows.map(mapRow);
  }
  /**
   * All invoices, newest first, without the list page limit.
   * Used by the backup so a restore can never silently drop records.
   *
   * @returns - Every stored invoice.
   */
  allInvoices() {
    const rows = this.db.prepare(`SELECT * FROM invoices ORDER BY created_at DESC, id DESC`).all();
    return rows.map(mapRow);
  }
  /**
   * Updates a draft; issued/cancelled invoices are immutable.
   *
   * @param id - Invoice UUID.
   * @param patch - Partial draft content.
   */
  updateDraft(id, patch) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "draft") {
      throw new Error("Only drafts can be edited; issued invoices need a correction invoice.");
    }
    const pick = (next, fallback) => {
      var _a2;
      return next === null || next === "" ? void 0 : (_a2 = next != null ? next : fallback) != null ? _a2 : void 0;
    };
    const kindSwitch = patch.docType !== void 0 && (0, import_invoice_model.normalizeDocumentType)(patch.docType) !== current.docType;
    const merged = {
      seller: (_a = patch.seller) != null ? _a : current.seller,
      buyer: (_b = patch.buyer) != null ? _b : current.buyer,
      lines: (_c = patch.lines) != null ? _c : current.lines,
      issueDate: (_d = patch.issueDate) != null ? _d : current.issueDate,
      deliveryDate: (_e = patch.deliveryDate) != null ? _e : current.deliveryDate,
      dueDate: pick(patch.dueDate, current.dueDate),
      currency: "EUR",
      employeeCode: pick(patch.employeeCode, current.employeeCode),
      paymentTerms: pick(patch.paymentTerms, current.paymentTerms),
      docType: patch.docType === void 0 ? current.docType : (0, import_invoice_model.normalizeDocumentType)(patch.docType),
      documentTitle: pick(patch.documentTitle, current.documentTitle) || (kindSwitch ? (0, import_invoice_model.defaultDocumentTitle)(patch.docType) : current.documentTitle),
      notes: pick(patch.notes, current.notes),
      skontoPercent: (_f = patch.skontoPercent) != null ? _f : current.skontoPercent,
      skontoDueDate: pick(patch.skontoDueDate, current.skontoDueDate),
      validUntil: pick(patch.validUntil, current.validUntil),
      // R6.3: missing keeps the binding, null or empty unbinds it
      companyId: patch.companyId === void 0 ? current.companyId : patch.companyId
    };
    const companyId = this.checkedCompanyId(merged.companyId);
    const totals = (0, import_invoice_model.calcTotals)(merged.lines.length > 0 ? merged.lines : []);
    this.db.prepare(
      `UPDATE invoices SET issue_date = ?, delivery_date = ?, due_date = ?, seller_json = ?, buyer_json = ?,
				lines_json = ?, totals_json = ?, document_title = ?, notes = ?, payment_terms = ?, employee_code = ?,
				skonto_percent = ?, skonto_due_date = ?, doc_type = ?, valid_until = ?, company_id = ?, updated_at = ? WHERE id = ?`
    ).run(
      merged.issueDate,
      merged.deliveryDate,
      (_g = merged.dueDate) != null ? _g : null,
      JSON.stringify(merged.seller),
      JSON.stringify(merged.buyer),
      JSON.stringify(merged.lines),
      JSON.stringify(totals),
      (_h = merged.documentTitle) != null ? _h : "Rechnung",
      (_i = merged.notes) != null ? _i : null,
      (_j = merged.paymentTerms) != null ? _j : null,
      ((_k = merged.employeeCode) == null ? void 0 : _k.trim()) ? (0, import_invoice_model.normalizeEmployeeCode)(merged.employeeCode) : null,
      Number(merged.skontoPercent) || 0,
      ((_l = merged.skontoDueDate) == null ? void 0 : _l.trim()) || null,
      (0, import_invoice_model.normalizeDocumentType)(merged.docType),
      ((_m = merged.validUntil) == null ? void 0 : _m.trim()) || null,
      companyId,
      nowIso(),
      id
    );
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Draft update failed");
    }
    return updated;
  }
  /**
   * Issues a draft: validates Pflichtangaben, assigns the next number
   * (`YYYY-EE-NNN` for invoices, `A-YYYY-EE-NNN` for quotations — separate
   * circles, from issue year + employee code) atomically and freezes the
   * record. File paths are attached later
   * by the P2/P3 generation step via attachIssueArtifacts().
   *
   * @param id - Draft UUID.
   */
  issueDraft(id) {
    var _a, _b, _c, _d;
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "draft") {
      throw new Error("Only drafts can be issued.");
    }
    const year = Number(current.issueDate.slice(0, 4));
    if (!Number.isInteger(year)) {
      throw new Error(`Invalid issue year in ${current.issueDate}`);
    }
    const docType = (0, import_invoice_model.normalizeDocumentType)(current.docType);
    const errors = (0, import_invoice_model.validateInvoiceForIssue)({
      seller: current.seller,
      buyer: current.buyer,
      lines: current.lines,
      issueDate: current.issueDate,
      deliveryDate: current.deliveryDate,
      dueDate: (_a = current.dueDate) != null ? _a : void 0,
      currency: "EUR",
      docType: current.docType,
      employeeCode: (_b = current.employeeCode) != null ? _b : void 0,
      documentTitle: current.documentTitle,
      notes: (_c = current.notes) != null ? _c : void 0,
      validUntil: (_d = current.validUntil) != null ? _d : void 0
    });
    if (errors.length > 0) {
      throw new Error(`Invoice not issuable: ${errors.join(" | ")}`);
    }
    const run = this.db.transaction(() => {
      var _a2, _b2, _c2;
      const number = this.nextDocumentNumber(docType, year, (_a2 = current.employeeCode) != null ? _a2 : void 0);
      const validUntil = (0, import_invoice_model.isQuote)(docType) ? ((_b2 = current.validUntil) == null ? void 0 : _b2.trim()) || (0, import_invoice_model.defaultValidUntil)(current.issueDate) : (_c2 = current.validUntil) != null ? _c2 : null;
      this.db.prepare(
        `UPDATE invoices SET number = ?, status = 'issued', totals_json = ?, retain_until = ?, valid_until = ?, updated_at = ? WHERE id = ? AND status = 'draft'`
      ).run(
        number,
        JSON.stringify((0, import_invoice_model.calcTotals)(current.lines)),
        // § 147 AO / § 14b UStG: ten years, computed once at issuance.
        // A quotation is no booking record, so it carries no
        // retention date at all (R8).
        (0, import_invoice_model.isQuote)(docType) ? null : retentionUntil(current.issueDate),
        validUntil,
        nowIso(),
        id
      );
      const issued = this.getInvoice(id);
      if (!issued || issued.number !== number) {
        throw new Error("Issue transaction failed");
      }
      return issued;
    });
    return run();
  }
  /**
   * Records the customer's decision on an issued quotation (R8).
   *
   * The decision is bookkeeping only: it never changes the frozen PDF, it
   * documents what the customer said and when. A second decision is refused,
   * so a mis-click cannot overwrite the first answer.
   *
   * @param id - Quotation UUID.
   * @param decision - `accepted` or `rejected`.
   * @param options - Optional timestamp and rejection reason.
   * @param options.at - ISO timestamp of the decision, defaults to now.
   * @param options.reason - Free-text reason, stored with a rejection.
   */
  setQuoteDecision(id, decision, options = {}) {
    var _a, _b;
    if (decision !== "accepted" && decision !== "rejected") {
      throw new Error(`Unknown decision: ${String(decision)}`);
    }
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (!(0, import_invoice_model.isQuote)(current.docType)) {
      throw new Error("Only a quotation knows a customer decision (R8).");
    }
    if (current.status !== "issued") {
      throw new Error("Issue the quotation before recording a decision.");
    }
    if (current.acceptedAt || current.rejectedAt) {
      throw new Error("The decision on this quotation was already recorded.");
    }
    const at = ((_a = options.at) == null ? void 0 : _a.trim()) || nowIso();
    if (decision === "accepted") {
      this.db.prepare(`UPDATE invoices SET accepted_at = ?, updated_at = ? WHERE id = ?`).run(at, nowIso(), id);
    } else {
      this.db.prepare(`UPDATE invoices SET rejected_at = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`).run(at, ((_b = options.reason) == null ? void 0 : _b.trim()) || null, nowIso(), id);
    }
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Decision update failed");
    }
    return updated;
  }
  /**
   * Creates an invoice draft from a quotation (R8).
   *
   * The quotation itself is never edited (GoBD): the draft copies parties,
   * lines, terms and cash discount, points back through `source_document_id`
   * and is then issued as an ordinary invoice with a number from the invoice
   * circle. Its own issue date defaults to today, because the invoice is
   * dated when it is written — not when the offer was made.
   *
   * @param quoteId - Quotation UUID.
   * @param patch - Overrides for the new draft (lines, dates, terms …).
   * @param options - Conversion options.
   * @param options.requireAccepted - Refuse a quotation the customer has not accepted yet.
   */
  convertQuoteToInvoice(quoteId, patch = {}, options = {}) {
    var _a, _b, _c, _d, _e;
    const quote = this.getInvoice(quoteId);
    if (!quote) {
      throw new Error(`Invoice not found: ${quoteId}`);
    }
    if (!(0, import_invoice_model.isQuote)(quote.docType)) {
      throw new Error("Only a quotation can be turned into an invoice (R8).");
    }
    if (quote.status !== "issued") {
      throw new Error("Issue the quotation before creating an invoice from it.");
    }
    if (options.requireAccepted && (0, import_invoice_model.quoteState)(quote) !== "accepted") {
      throw new Error("The customer has not accepted this quotation yet.");
    }
    const openDraft = this.listInvoices({ docType: "invoice", status: "draft", sourceDocumentId: quote.id });
    if (openDraft.length > 0) {
      throw new Error(`An invoice draft from this quotation already exists: ${openDraft[0].id}`);
    }
    return this.createDraft({
      ...(0, import_invoice_model.blankDraft)((0, import_invoice_model.todayIso)(), "invoice"),
      seller: quote.seller,
      buyer: quote.buyer,
      lines: quote.lines,
      deliveryDate: quote.deliveryDate,
      paymentTerms: (_a = quote.paymentTerms) != null ? _a : void 0,
      notes: (_b = quote.notes) != null ? _b : void 0,
      employeeCode: (_c = quote.employeeCode) != null ? _c : void 0,
      companyId: quote.companyId,
      skontoPercent: quote.skontoPercent,
      skontoDueDate: (_d = quote.skontoDueDate) != null ? _d : void 0,
      ...patch,
      // a conversion never produces anything but an invoice
      docType: "invoice",
      documentTitle: ((_e = patch.documentTitle) == null ? void 0 : _e.trim()) || (0, import_invoice_model.defaultDocumentTitle)("invoice"),
      sourceDocumentId: quote.id
    });
  }
  /**
   * Attaches generated artifacts (XML string + file paths) to an issued invoice.
   *
   * @param id - Issued invoice UUID.
   * @param artifacts - Generated output (XML plus file paths).
   */
  attachIssueArtifacts(id, artifacts) {
    var _a, _b, _c;
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "issued") {
      throw new Error("Artifacts can only be attached to issued invoices.");
    }
    this.db.prepare(
      `UPDATE invoices SET xml = ?, pdf_path = ?, xlsx_path = ?, template_id = ?, template_snapshot_json = COALESCE(?, template_snapshot_json), updated_at = ? WHERE id = ?`
    ).run(
      (_a = artifacts.xml) != null ? _a : null,
      artifacts.pdfPath,
      (_b = artifacts.xlsxPath) != null ? _b : null,
      (_c = artifacts.templateId) != null ? _c : null,
      artifacts.templateSnapshot ? JSON.stringify(artifacts.templateSnapshot) : null,
      nowIso(),
      id
    );
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Artifact update failed");
    }
    return updated;
  }
  /**
   * Marks an issued invoice as paid or unpaid. Payment state is bookkeeping
   * only — it never changes the frozen XML artifact (GoBD).
   *
   * @param id - Invoice UUID.
   * @param paid - New payment state.
   * @param paidAt - ISO date of the payment, defaults to now.
   */
  setPaid(id, paid, paidAt) {
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status === "draft") {
      throw new Error("Only issued invoices can be marked as paid.");
    }
    this.db.prepare(`UPDATE invoices SET paid = ?, paid_at = ?, updated_at = ? WHERE id = ?`).run(paid ? 1 : 0, paid ? (paidAt == null ? void 0 : paidAt.trim()) || nowIso() : null, nowIso(), id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Payment update failed");
    }
    return updated;
  }
  /**
   * Reverses an issued invoice the GoBD way: a real credit note (Gutschrift)
   * with its own number is created as a draft, the original is marked
   * cancelled and both are linked. The original is never deleted or edited.
   *
   * @param id - Issed invoice UUID to reverse.
   * @param reason - Reason printed on the credit note.
   * @returns The linked credit-note draft and the cancelled original.
   */
  reverseInvoice(id, reason) {
    var _a, _b, _c, _d;
    const original = this.getInvoice(id);
    if (!original) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (original.status !== "issued") {
      throw new Error("Only issued invoices can be reversed (Storno).");
    }
    const existing = this.listInvoices({ status: "draft" }).find((draft) => draft.stornoOfId === id);
    if (existing) {
      throw new Error(`A Storno draft for ${original.number} already exists (${existing.id}).`);
    }
    const reversal = this.createDraft({
      seller: original.seller,
      buyer: original.buyer,
      lines: original.lines,
      issueDate: (0, import_invoice_model.todayIso)(),
      deliveryDate: original.deliveryDate,
      dueDate: (_a = original.dueDate) != null ? _a : void 0,
      currency: "EUR",
      employeeCode: (_b = original.employeeCode) != null ? _b : void 0,
      companyId: original.companyId,
      paymentTerms: (_c = original.paymentTerms) != null ? _c : void 0,
      skontoPercent: original.skontoPercent,
      skontoDueDate: (_d = original.skontoDueDate) != null ? _d : void 0,
      documentTitle: "Gutschrift",
      notes: `Storno zu Rechnung ${original.number}${(reason == null ? void 0 : reason.trim()) ? ` \u2013 ${reason.trim()}` : ""}`
    });
    const run = this.db.transaction(() => {
      this.db.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'issued'`).run(nowIso(), id);
      this.db.prepare(`UPDATE invoices SET storno_of_id = ?, updated_at = ? WHERE id = ?`).run(id, nowIso(), reversal.id);
      const cancelled = this.getInvoice(id);
      if (!cancelled || cancelled.status !== "cancelled") {
        throw new Error("Storno transaction failed");
      }
      const linked = this.getInvoice(reversal.id);
      if (!linked || linked.stornoOfId !== id) {
        throw new Error("Storno link failed");
      }
      return { reversal: linked, original: cancelled };
    });
    return run();
  }
  /**
   * Cancels an issued invoice (placeholder for Storno; credit notes in P2).
   *
   * @param id - Issued invoice UUID.
   */
  cancelInvoice(id) {
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "issued") {
      throw new Error("Only issued invoices can be cancelled.");
    }
    this.db.prepare(`UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(nowIso(), id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error("Cancel failed");
    }
    return updated;
  }
  /**
   * Counts invoices per status (dashboard).
   */
  countByStatus() {
    const rows = this.db.prepare(`SELECT status, COUNT(*) AS n FROM invoices GROUP BY status`).all();
    const result = { draft: 0, issued: 0, cancelled: 0 };
    for (const row of rows) {
      if (row.status === "draft" || row.status === "issued" || row.status === "cancelled") {
        result[row.status] = row.n;
      }
    }
    return result;
  }
  /**
   * Creates a layout template (validated by the Pflichtfeld-Wächter).
   *
   * @param name - Display name.
   * @param definition - Layout definition.
   */
  createTemplate(name, definition) {
    const errors = (0, import_templates.validateTemplate)({ ...definition, name });
    if (errors.length > 0) {
      throw new Error(`Invalid template: ${errors.join(" | ")}`);
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const hasAny = this.db.prepare(`SELECT COUNT(*) AS n FROM templates`).get().n > 0;
    this.db.prepare(
      `INSERT INTO templates (id, name, version, definition_json, is_default, created_at, updated_at)
				VALUES (?, ?, 1, ?, ?, ?, ?)`
    ).run(
      id,
      name.trim(),
      JSON.stringify({ ...(0, import_templates.stripCleared)(definition), name: name.trim() }),
      hasAny ? 0 : 1,
      stamp,
      stamp
    );
    const created = this.getTemplate(id);
    if (!created) {
      throw new Error("Template was not stored");
    }
    return created;
  }
  /**
   * Loads one template by id.
   *
   * @param id - Template UUID.
   */
  getTemplate(id) {
    const row = this.db.prepare(`SELECT * FROM templates WHERE id = ?`).get(id);
    return row ? mapTemplateRow(row) : null;
  }
  /**
   * Lists templates, default first, then by name.
   */
  listTemplates() {
    const rows = this.db.prepare(`SELECT * FROM templates ORDER BY is_default DESC, name ASC`).all();
    return rows.map(mapTemplateRow);
  }
  /**
   * Returns the default template, if any.
   */
  getDefaultTemplate() {
    const row = this.db.prepare(`SELECT * FROM templates WHERE is_default = 1 LIMIT 1`).get();
    return row ? mapTemplateRow(row) : null;
  }
  /**
   * Creates the default template on first start (idempotent).
   */
  ensureDefaultTemplate() {
    const existing = this.getDefaultTemplate();
    if (existing) {
      return existing;
    }
    if (this.listTemplates().length === 0) {
      return this.createTemplate(import_templates.DEFAULT_TEMPLATE.name, import_templates.DEFAULT_TEMPLATE);
    }
    const first = this.listTemplates()[0];
    this.setDefaultTemplate(first.id);
    const updated = this.getDefaultTemplate();
    if (!updated) {
      throw new Error("Default template setup failed");
    }
    return updated;
  }
  /**
   * Updates name/definition (bumps version, revalidates).
   *
   * @param id - Template UUID.
   * @param patch - Partial update.
   */
  updateTemplate(id, patch) {
    var _a, _b, _c, _d, _e;
    const current = this.getTemplate(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }
    const nextName = ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name;
    const patchDef = (_b = patch.definition) != null ? _b : {};
    const merged = {
      ...current.definition,
      ...patchDef,
      blocks: { ...current.definition.blocks, ...(_c = patchDef.blocks) != null ? _c : {} },
      colors: { ...current.definition.colors, ...(_d = patchDef.colors) != null ? _d : {} },
      name: ((_e = patchDef.name) == null ? void 0 : _e.trim()) || nextName
    };
    const next = (0, import_templates.stripCleared)(merged);
    const errors = (0, import_templates.validateTemplate)(next);
    if (errors.length > 0) {
      throw new Error(`Invalid template: ${errors.join(" | ")}`);
    }
    this.db.prepare(
      `UPDATE templates SET name = ?, definition_json = ?, version = version + 1, updated_at = ? WHERE id = ?`
    ).run(nextName, JSON.stringify(next), nowIso(), id);
    const updated = this.getTemplate(id);
    if (!updated) {
      throw new Error("Template update failed");
    }
    return updated;
  }
  /**
   * Marks one template as default (atomic switch).
   *
   * @param id - Template UUID.
   */
  setDefaultTemplate(id) {
    const current = this.getTemplate(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }
    const run = this.db.transaction(() => {
      this.db.prepare(`UPDATE templates SET is_default = 0`).run();
      this.db.prepare(`UPDATE templates SET is_default = 1, updated_at = ? WHERE id = ?`).run(nowIso(), id);
    });
    run();
    const updated = this.getTemplate(id);
    if (!updated) {
      throw new Error("Default switch failed");
    }
    return updated;
  }
  /**
   * Deletes a template (never the default, never when referenced).
   *
   * @param id - Template UUID.
   */
  deleteTemplate(id) {
    const current = this.getTemplate(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }
    if (current.isDefault) {
      throw new Error("The default template cannot be deleted");
    }
    const refs = this.db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE template_id = ?`).get(id);
    if (refs.n > 0) {
      throw new Error("Template is referenced by issued invoices and cannot be deleted");
    }
    this.db.prepare(`DELETE FROM templates WHERE id = ?`).run(id);
  }
  /**
   * Adds a file attachment to a draft.
   *
   * Only drafts may carry attachments: an issued invoice is frozen, and its
   * PDF/XML already name the files (GoBD). Type, size and count come from
   * `attachments.ts`, so no caller can bypass them.
   *
   * @param invoiceId - Owning invoice UUID.
   * @param attachment - Filename, declared MIME type and content.
   */
  addAttachment(invoiceId, attachment) {
    const invoice = this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    if (invoice.status !== "draft") {
      throw new Error("Only drafts can carry attachments; an issued invoice is frozen.");
    }
    const check = (0, import_attachments.checkAttachment)(attachment);
    if (!check.ok) {
      throw new Error(check.error);
    }
    if (this.countAttachments(invoiceId) >= import_attachments.ATTACHMENT_MAX_COUNT) {
      throw new Error(`At most ${import_attachments.ATTACHMENT_MAX_COUNT} attachments per invoice`);
    }
    const result = this.db.prepare(
      `INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
				VALUES (?, ?, ?, ?, ?, ?)`
    ).run(invoiceId, check.filename, check.mime, attachment.data.length, attachment.data, nowIso());
    const row = this.db.prepare(`SELECT * FROM attachments WHERE id = ?`).get(result.lastInsertRowid);
    return mapAttachment(row);
  }
  /**
   * Lists attachments of one invoice including their content.
   *
   * Prefer `listAttachmentMeta` for listings: a PDF or an image can be several
   * megabytes, and `SELECT *` would pull every BLOB into memory.
   *
   * @param invoiceId - Owning invoice UUID.
   */
  listAttachments(invoiceId) {
    const rows = this.db.prepare(`SELECT * FROM attachments WHERE invoice_id = ? ORDER BY id ASC`).all(invoiceId);
    return rows.map(mapAttachment);
  }
  /**
   * Lists the attachments of one invoice without their content.
   *
   * @param invoiceId - Owning invoice UUID.
   */
  listAttachmentMeta(invoiceId) {
    const rows = this.db.prepare(
      `SELECT id, invoice_id, filename, mime, size, created_at
				FROM attachments WHERE invoice_id = ? ORDER BY id ASC`
    ).all(invoiceId);
    return rows.map(mapAttachmentMeta);
  }
  /**
   * Reads one attachment including its content.
   *
   * @param invoiceId - Owning invoice UUID.
   * @param attachmentId - Row id of the attachment.
   */
  getAttachment(invoiceId, attachmentId) {
    const row = this.db.prepare(`SELECT * FROM attachments WHERE id = ? AND invoice_id = ?`).get(attachmentId, invoiceId);
    return row ? mapAttachment(row) : void 0;
  }
  /**
   * Counts the attachments of one invoice.
   *
   * @param invoiceId - Owning invoice UUID.
   */
  countAttachments(invoiceId) {
    const row = this.db.prepare(`SELECT COUNT(*) AS n FROM attachments WHERE invoice_id = ?`).get(invoiceId);
    return row.n;
  }
  /**
   * Deletes one attachment of a draft.
   *
   * Issued invoices keep their attachments: the stored PDF/XML name them, so
   * dropping one afterwards would break the frozen record (GoBD).
   *
   * @param invoiceId - Owning invoice UUID.
   * @param attachmentId - Row id of the attachment.
   */
  deleteAttachment(invoiceId, attachmentId) {
    const invoice = this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    if (invoice.status !== "draft") {
      throw new Error("Only drafts can change attachments; an issued invoice is frozen.");
    }
    const result = this.db.prepare(`DELETE FROM attachments WHERE id = ? AND invoice_id = ?`).run(attachmentId, invoiceId);
    if (result.changes === 0) {
      throw new Error(`Attachment not found: ${attachmentId}`);
    }
  }
  /**
   * Exports the full database content for backups.
   */
  exportData() {
    const counters = this.db.prepare(
      `SELECT year, employee, doc_type, last_seq FROM counters ORDER BY year ASC, employee ASC, doc_type ASC`
    ).all();
    const attachments = this.db.prepare(`SELECT * FROM attachments ORDER BY id ASC`).all();
    return {
      formatVersion: 1,
      exportedAt: nowIso(),
      schemaVersion: this.currentVersion(),
      invoices: this.allInvoices(),
      counters,
      templates: this.listTemplates(),
      companies: this.listCompanyProfiles(),
      customers: this.listCustomers(),
      products: this.listProducts(),
      dunningTexts: this.storedDunningTexts(),
      attachments: attachments.map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        filename: row.filename,
        mime: row.mime,
        size: row.size,
        data: row.data,
        createdAt: row.created_at
      }))
    };
  }
  /**
   * Replaces the full database content (restore path, transactional).
   * Validates the shape first so bad dumps fail before touching data.
   * A collection missing from the dump is kept as-is instead of being
   * wiped, so a partial/older backup can never destroy records silently.
   *
   * @param dump - Database content from a backup.
   */
  importData(dump) {
    if (!dump || dump.formatVersion !== 1 || !Array.isArray(dump.invoices) || !Array.isArray(dump.templates)) {
      throw new Error("Unsupported dump format");
    }
    for (const invoice of dump.invoices) {
      if (!invoice.id || !["draft", "issued", "cancelled"].includes(invoice.status) || !invoice.totals) {
        throw new Error(`Corrupt invoice in dump: ${String(invoice.id)}`);
      }
    }
    const has = (key) => Array.isArray(dump[key]);
    const run = this.db.transaction(() => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
      this.db.prepare(`DELETE FROM attachments`).run();
      this.db.prepare(`DELETE FROM invoices`).run();
      this.db.prepare(`DELETE FROM counters`).run();
      this.db.prepare(`DELETE FROM templates`).run();
      if (has("companies")) {
        this.db.prepare(`DELETE FROM company_profiles`).run();
      }
      if (has("customers")) {
        this.db.prepare(`DELETE FROM customers`).run();
      }
      if (has("products")) {
        this.db.prepare(`DELETE FROM products`).run();
      }
      if (has("dunningTexts")) {
        this.db.prepare(`DELETE FROM dunning_texts`).run();
        for (const row of (_a = dump.dunningTexts) != null ? _a : []) {
          const errors = (0, import_dunning.validateDunningPatch)(row.level, row);
          if (errors.length > 0) {
            throw new Error(`Corrupt dunning text in dump: ${errors.join(" | ")}`);
          }
          this.db.prepare(
            `INSERT INTO dunning_texts (level, subject, body, days, deadline_days, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
          ).run(row.level, row.subject, row.body, row.days, row.deadlineDays, nowIso());
        }
      }
      const mergedCounters = /* @__PURE__ */ new Map();
      for (const counter of (_b = dump.counters) != null ? _b : []) {
        const employee = (0, import_invoice_model.normalizeEmployeeCode)((_c = counter.employee) != null ? _c : "00");
        const docType = (0, import_invoice_model.normalizeDocumentType)(counter.doc_type);
        const key = `${counter.year}/${employee}/${docType}`;
        const prev = mergedCounters.get(key);
        if (!prev || counter.last_seq > prev.last_seq) {
          mergedCounters.set(key, {
            year: counter.year,
            employee,
            doc_type: docType,
            last_seq: counter.last_seq
          });
        }
      }
      for (const counter of mergedCounters.values()) {
        this.db.prepare(`INSERT INTO counters (year, employee, doc_type, last_seq) VALUES (?, ?, ?, ?)`).run(counter.year, counter.employee, counter.doc_type, counter.last_seq);
      }
      for (const template of dump.templates) {
        this.db.prepare(
          `INSERT INTO templates (id, name, version, definition_json, is_default, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          template.id,
          template.name,
          template.version,
          JSON.stringify(template.definition),
          template.isDefault ? 1 : 0,
          template.createdAt,
          template.updatedAt
        );
      }
      for (const invoice of dump.invoices) {
        this.db.prepare(
          `INSERT INTO invoices
					(id, number, issue_date, delivery_date, due_date, seller_json, buyer_json, lines_json, totals_json,
					 profile, status, template_id, document_title, notes, payment_terms, employee_code, xml, pdf_path, xlsx_path,
					 paid, paid_at, storno_of_id, skonto_percent, skonto_due_date, sent_at, send_channel, payment_check,
					 payment_checked_at, reminded_at, reminder_level, retain_until, created_at, updated_at, doc_type,
					 valid_until, source_document_id, accepted_at, rejected_at, rejection_reason, template_snapshot_json, company_id)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          invoice.id,
          invoice.number,
          invoice.issueDate,
          invoice.deliveryDate,
          invoice.dueDate,
          JSON.stringify(invoice.seller),
          JSON.stringify(invoice.buyer),
          JSON.stringify(invoice.lines),
          JSON.stringify(invoice.totals),
          invoice.profile,
          invoice.status,
          invoice.templateId,
          invoice.documentTitle,
          invoice.notes,
          (_d = invoice.paymentTerms) != null ? _d : null,
          (_e = invoice.employeeCode) != null ? _e : null,
          invoice.xml,
          invoice.pdfPath,
          invoice.xlsxPath,
          invoice.paid ? 1 : 0,
          (_f = invoice.paidAt) != null ? _f : null,
          (_g = invoice.stornoOfId) != null ? _g : null,
          Number(invoice.skontoPercent) || 0,
          (_h = invoice.skontoDueDate) != null ? _h : null,
          (_i = invoice.sentAt) != null ? _i : null,
          (_j = invoice.sendChannel) != null ? _j : null,
          (_k = invoice.paymentCheck) != null ? _k : null,
          (_l = invoice.paymentCheckedAt) != null ? _l : null,
          (_m = invoice.remindedAt) != null ? _m : null,
          (_n = invoice.reminderLevel) != null ? _n : 0,
          // a dump from before R8 has no retention date: recomputing it
          // keeps ten years of § 147 AO. A quotation never gets one.
          (_o = invoice.retainUntil) != null ? _o : (0, import_invoice_model.isQuote)(invoice.docType) ? null : retentionUntil(invoice.issueDate),
          invoice.createdAt,
          invoice.updatedAt,
          (0, import_invoice_model.normalizeDocumentType)(invoice.docType),
          (_p = invoice.validUntil) != null ? _p : null,
          (_q = invoice.sourceDocumentId) != null ? _q : null,
          (_r = invoice.acceptedAt) != null ? _r : null,
          (_s = invoice.rejectedAt) != null ? _s : null,
          (_t = invoice.rejectionReason) != null ? _t : null,
          invoice.templateSnapshot ? JSON.stringify(invoice.templateSnapshot) : null,
          (_u = invoice.companyId) != null ? _u : null
        );
      }
      for (const company of (_v = dump.companies) != null ? _v : []) {
        this.db.prepare(
          `INSERT INTO company_profiles (id, name, profile_json, is_default, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          company.id,
          company.name,
          JSON.stringify(company.profile),
          company.isDefault ? 1 : 0,
          company.createdAt,
          company.updatedAt
        );
      }
      for (const customer of (_w = dump.customers) != null ? _w : []) {
        this.db.prepare(
          `INSERT INTO customers (id, name, profile_json, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?)`
        ).run(
          customer.id,
          customer.name,
          JSON.stringify(customer.profile),
          customer.createdAt,
          customer.updatedAt
        );
      }
      for (const product of (_x = dump.products) != null ? _x : []) {
        this.db.prepare(
          `INSERT INTO products (id, sku, name, details, unit, unit_price_net, vat_rate, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          product.id,
          product.sku,
          product.name,
          product.details,
          product.unit,
          product.unitPriceNet,
          product.vatRate,
          product.createdAt,
          product.updatedAt
        );
      }
      for (const attachment of (_y = dump.attachments) != null ? _y : []) {
        this.db.prepare(
          `INSERT INTO attachments (invoice_id, filename, mime, size, data, created_at)
						VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          attachment.invoiceId,
          attachment.filename,
          attachment.mime,
          attachment.size,
          attachment.data,
          attachment.createdAt
        );
      }
    });
    run();
  }
  /**
   * Logs a backup in the database.
   *
   * @param entry - Filename, size, hash and manifest.
   */
  logBackup(entry) {
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    this.db.prepare(
      `INSERT INTO backups (id, created_at, filename, size, sha256, manifest_json) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, stamp, entry.filename, entry.size, entry.sha256, entry.manifestJson);
    return { id, createdAt: stamp, ...entry };
  }
  /**
   * Lists logged backups, newest first.
   */
  listBackups() {
    const rows = this.db.prepare(`SELECT * FROM backups ORDER BY created_at DESC`).all();
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      filename: row.filename,
      size: row.size,
      sha256: row.sha256,
      manifestJson: row.manifest_json
    }));
  }
  /**
   * Records that an issued invoice's artifacts were re-rendered. The original
   * file is archived rather than overwritten, so the delivered document stays
   * reproducible (GoBD) while a corrected rendering becomes available.
   *
   * @param invoiceId - Issued invoice UUID.
   * @param artifact - Which file was regenerated, e.g. `pdf`.
   * @param previousPath - Path of the archived original, if any.
   * @param newPath - Path of the freshly rendered file.
   * @param reason - Free text, stored for the audit trail.
   * @param layout - Which layout was used: `issued`, `current` or `current-unfrozen` (R7.8).
   */
  logRender(invoiceId, artifact, previousPath, newPath, reason, layout = null) {
    this.db.prepare(
      `INSERT INTO render_history (invoice_id, artifact, previous_path, new_path, reason, layout, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(invoiceId, artifact, previousPath, newPath, reason, layout, nowIso());
  }
  /**
   * Lists the re-render history of an invoice, newest first.
   *
   * @param invoiceId - Issued invoice UUID.
   */
  listRenderHistory(invoiceId) {
    const rows = this.db.prepare(`SELECT * FROM render_history WHERE invoice_id = ? ORDER BY created_at DESC, id DESC`).all(invoiceId);
    return rows.map((row) => {
      var _a;
      return {
        artifact: row.artifact,
        previousPath: row.previous_path,
        newPath: row.new_path,
        reason: row.reason,
        layout: (_a = row.layout) != null ? _a : null,
        createdAt: row.created_at
      };
    });
  }
  /**
   * Stores one validation report. The JSON file itself is written by the API
   * layer, so drafts (no number, no artifacts yet) and issued invoices share
   * the same flow.
   *
   * @param invoiceId - Invoice UUID the report belongs to.
   * @param reportPath - Storage-relative path of the JSON report.
   * @param formatErrors - Number of technical (XSD) errors in this run.
   * @param businessErrors - Number of business-rule findings in this run.
   * @returns The running number used in the filename.
   */
  logValidationReport(invoiceId, reportPath, formatErrors, businessErrors) {
    const seq = this.nextValidationSeq(invoiceId);
    this.db.prepare(
      `INSERT INTO validation_reports (invoice_id, seq, report_path, format_errors, business_errors, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(invoiceId, seq, reportPath, formatErrors, businessErrors, nowIso());
    return seq;
  }
  /**
   * Highest running number of an invoice's validation reports, 0 when none
   * exists yet. Public because the API needs the same number for the file
   * name it is about to write.
   *
   * @param invoiceId - Invoice UUID.
   */
  nextValidationSeq(invoiceId) {
    var _a;
    const row = this.db.prepare(`SELECT MAX(seq) AS max_seq FROM validation_reports WHERE invoice_id = ?`).get(invoiceId);
    return ((_a = row.max_seq) != null ? _a : 0) + 1;
  }
  /**
   * Lists the stored validation reports of an invoice, newest first.
   *
   * @param invoiceId - Invoice UUID.
   */
  listValidationReports(invoiceId) {
    const rows = this.db.prepare(`SELECT * FROM validation_reports WHERE invoice_id = ? ORDER BY seq DESC`).all(invoiceId);
    return rows.map((row) => ({
      seq: row.seq,
      reportPath: row.report_path,
      formatErrors: row.format_errors,
      businessErrors: row.business_errors,
      createdAt: row.created_at
    }));
  }
  /**
   * Deletes a draft. Issued, cancelled and Storno documents are never deleted:
   * they are tax relevant and must stay reproducible (GoBD, § 147 AO).
   *
   * @param id - Draft UUID.
   */
  deleteDraft(id) {
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status !== "draft") {
      throw new Error("Only drafts can be deleted. An issued invoice must be cancelled with a Storno.");
    }
    if (current.number) {
      throw new Error("This draft already carries a number and cannot be deleted.");
    }
    this.db.prepare(`DELETE FROM invoices WHERE id = ? AND status = 'draft'`).run(id);
  }
  /**
   * Records the handover of an issued invoice to the customer.
   *
   * @param id - Issued invoice UUID.
   * @param sentAt - ISO timestamp, default now.
   * @param channel - Delivery channel, e.g. `E-Mail`.
   */
  markSent(id, sentAt, channel) {
    const current = this.getInvoice(id);
    if (!current) {
      throw new Error(`Invoice not found: ${id}`);
    }
    if (current.status === "draft") {
      throw new Error("Only issued invoices can be marked as sent.");
    }
    this.db.prepare(`UPDATE invoices SET sent_at = ?, send_channel = ?, updated_at = ? WHERE id = ?`).run(sentAt, channel, nowIso(), id);
    return this.getInvoice(id);
  }
  /**
   * Stores the result of the § 16 Abs. 2 Nr. 2 UStG payment-method check.
   *
   * @param id - Issued invoice UUID.
   * @param outcome - `passed`, `failed` or a free-text remark.
   */
  setPaymentCheck(id, outcome) {
    this.db.prepare(`UPDATE invoices SET payment_check = ?, payment_checked_at = ?, updated_at = ? WHERE id = ?`).run(outcome, nowIso(), nowIso(), id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error(`Invoice not found: ${id}`);
    }
    return updated;
  }
  /**
   * The dunning levels the user changed, as stored.
   */
  storedDunningTexts() {
    const rows = this.db.prepare(`SELECT * FROM dunning_texts ORDER BY level`).all();
    return rows.map((row) => ({
      level: row.level,
      subject: row.subject,
      body: row.body,
      days: row.days,
      deadlineDays: row.deadline_days
    }));
  }
  /**
   * The three dunning levels: the user's text where one was saved, the built-in one else.
   */
  listDunningTexts() {
    const stored = new Map(this.storedDunningTexts().map((row) => [row.level, row]));
    return import_dunning.DEFAULT_DUNNING_TEXTS.map((fallback) => {
      const row = stored.get(fallback.level);
      return row ? { ...row, isDefault: false } : { ...fallback };
    });
  }
  /**
   * Changes one dunning level. The days must stay in rising order across the levels,
   * otherwise the second level could be suggested before the first.
   *
   * @param level - Level 1 to 3.
   * @param patch - Fields to change.
   * @returns All three levels.
   */
  saveDunningText(level, patch) {
    const errors = (0, import_dunning.validateDunningPatch)(level, patch);
    if (errors.length > 0) {
      throw new Error(`Invalid dunning text: ${errors.join(" | ")}`);
    }
    const levels = this.listDunningTexts();
    const current = levels.find((entry) => entry.level === level);
    const next = {
      ...current,
      subject: typeof patch.subject === "string" ? patch.subject.trim() : current.subject,
      body: typeof patch.body === "string" ? patch.body.trim() : current.body,
      days: typeof patch.days === "number" ? patch.days : current.days,
      deadlineDays: typeof patch.deadlineDays === "number" ? patch.deadlineDays : current.deadlineDays,
      isDefault: false
    };
    const before = levels.find((entry) => entry.level === level - 1);
    const after = levels.find((entry) => entry.level === level + 1);
    if (before && next.days <= before.days || after && next.days >= after.days) {
      throw new Error("Invalid dunning text: the days must rise from level to level");
    }
    this.db.prepare(
      `INSERT INTO dunning_texts (level, subject, body, days, deadline_days, updated_at) VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(level) DO UPDATE SET subject = excluded.subject, body = excluded.body, days = excluded.days,
				 deadline_days = excluded.deadline_days, updated_at = excluded.updated_at`
    ).run(level, next.subject, next.body, next.days, next.deadlineDays, nowIso());
    return this.listDunningTexts();
  }
  /**
   * Takes a level back to the built-in text.
   *
   * @param level - Level 1 to 3.
   * @returns All three levels.
   */
  resetDunningText(level) {
    if (!Number.isInteger(level) || level < 1 || level > import_dunning.MAX_DUNNING_LEVEL) {
      throw new Error(`Invalid dunning text: level must be 1 to ${import_dunning.MAX_DUNNING_LEVEL}`);
    }
    this.db.prepare(`DELETE FROM dunning_texts WHERE level = ?`).run(level);
    return this.listDunningTexts();
  }
  /**
   * Counts and remembers a dunning step.
   *
   * @param id - Issued invoice UUID.
   * @param on - Reference day, used for the "already reminded today" check.
   */
  registerReminder(id, on = (0, import_invoice_model.todayIso)()) {
    this.db.prepare(
      `UPDATE invoices SET reminder_level = reminder_level + 1, reminded_at = ?, updated_at = ? WHERE id = ?`
    ).run(`${on}T00:00:00.000Z`, nowIso(), id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error(`Invoice not found: ${id}`);
    }
    return updated;
  }
  /**
   * Sets the earliest legal deletion date (§ 147 AO / § 14b UStG, 10 years).
   *
   * @param id - Issued invoice UUID.
   * @param issueDate - ISO issue date the period starts from.
   */
  setRetention(id, issueDate) {
    const until = retentionUntil(issueDate);
    this.db.prepare(`UPDATE invoices SET retain_until = ? WHERE id = ?`).run(until, id);
    const updated = this.getInvoice(id);
    if (!updated) {
      throw new Error(`Invoice not found: ${id}`);
    }
    return updated;
  }
  /**
   * Creates a reusable invoice content template (recurring maintenance, flat
   * fees, ...). The buyer is left empty on purpose: a template describes the
   * positions, the customer is picked per invoice.
   *
   * @param name - Display name.
   * @param body - Draft content to reuse.
   */
  createInvoiceTemplate(name, body) {
    if (!name.trim()) {
      throw new Error("Template needs a name");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    this.db.prepare(
      `INSERT INTO invoice_templates (id, name, body_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, JSON.stringify(body), stamp, stamp);
    return { id, name, body, createdAt: stamp, updatedAt: stamp };
  }
  /**
   * Lists invoice content templates by name.
   */
  listInvoiceTemplates() {
    const rows = this.db.prepare(`SELECT * FROM invoice_templates ORDER BY name ASC`).all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      body: parseJson(row.body_json, "invoice template"),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  /**
   * Updates an invoice content template.
   *
   * @param id - Template UUID.
   * @param patch - New name and/or body.
   * @param patch.name - New display name.
   * @param patch.body - New draft content.
   * @returns The updated template.
   */
  updateInvoiceTemplate(id, patch) {
    if (!this.getInvoiceTemplate(id)) {
      throw new Error(`Template not found: ${id}`);
    }
    if (patch.name !== void 0) {
      if (!patch.name.trim()) {
        throw new Error("Template needs a name");
      }
      this.db.prepare(`UPDATE invoice_templates SET name = ? WHERE id = ?`).run(patch.name, id);
    }
    if (patch.body !== void 0) {
      this.db.prepare(`UPDATE invoice_templates SET body_json = ? WHERE id = ?`).run(JSON.stringify(patch.body), id);
    }
    this.db.prepare(`UPDATE invoice_templates SET updated_at = ? WHERE id = ?`).run(nowIso(), id);
    return this.getInvoiceTemplate(id);
  }
  /**
   * Loads one invoice content template.
   *
   * @param id - Template UUID.
   */
  getInvoiceTemplate(id) {
    const row = this.db.prepare(`SELECT * FROM invoice_templates WHERE id = ?`).get(id);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      body: parseJson(row.body_json, "invoice template"),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  /**
   * Deletes an invoice content template. Issued invoices keep their own copy
   * of the content, so deleting a template never changes a document.
   *
   * @param id - Template UUID.
   */
  deleteInvoiceTemplate(id) {
    if (!this.getInvoiceTemplate(id)) {
      throw new Error(`Template not found: ${id}`);
    }
    this.db.prepare(`DELETE FROM invoice_templates WHERE id = ?`).run(id);
  }
  /**
   * Creates a company (seller) profile; the first one becomes default.
   *
   * @param name - Display name.
   * @param profile - Seller party data.
   */
  createCompanyProfile(name, profile) {
    if (name.trim().length === 0) {
      throw new Error("Company profile needs a name");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const hasAny = this.db.prepare(`SELECT COUNT(*) AS n FROM company_profiles`).get().n > 0;
    this.db.prepare(
      `INSERT INTO company_profiles (id, name, profile_json, is_default, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name.trim(), JSON.stringify(profile), hasAny ? 0 : 1, stamp, stamp);
    const created = this.getCompanyProfile(id);
    if (!created) {
      throw new Error("Company profile was not stored");
    }
    return created;
  }
  /**
   * Loads one company profile by id.
   *
   * @param id - Profile UUID.
   */
  getCompanyProfile(id) {
    const row = this.db.prepare(`SELECT * FROM company_profiles WHERE id = ?`).get(id);
    return row ? mapCompanyRow(row) : null;
  }
  /**
   * Lists company profiles, default first.
   */
  listCompanyProfiles() {
    const rows = this.db.prepare(`SELECT * FROM company_profiles ORDER BY is_default DESC, name ASC`).all();
    return rows.map(mapCompanyRow);
  }
  /**
   * Returns the default company profile, if any.
   */
  getDefaultCompanyProfile() {
    const row = this.db.prepare(`SELECT * FROM company_profiles WHERE is_default = 1 LIMIT 1`).get();
    return row ? mapCompanyRow(row) : null;
  }
  /**
   * Creates the default company shell on first start (idempotent).
   * The user fills in their data once on the PWA Firma page.
   */
  ensureDefaultCompanyProfile() {
    const existing = this.getDefaultCompanyProfile();
    if (existing) {
      return existing;
    }
    const all = this.listCompanyProfiles();
    if (all.length === 0) {
      return this.createCompanyProfile("Meine Firma", {
        name: "",
        street: "",
        zip: "",
        city: "",
        country: "DE"
      });
    }
    return this.setDefaultCompanyProfile(all[0].id);
  }
  /**
   * Updates name/party data of a company profile.
   *
   * @param id - Profile UUID.
   * @param patch - Partial update.
   */
  updateCompanyProfile(id, patch) {
    var _a, _b;
    const current = this.getCompanyProfile(id);
    if (!current) {
      throw new Error(`Company profile not found: ${id}`);
    }
    const name = ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name;
    const profile = (_b = patch.profile) != null ? _b : current.profile;
    this.db.prepare(`UPDATE company_profiles SET name = ?, profile_json = ?, updated_at = ? WHERE id = ?`).run(name, JSON.stringify(profile), nowIso(), id);
    const updated = this.getCompanyProfile(id);
    if (!updated) {
      throw new Error("Company profile update failed");
    }
    return updated;
  }
  /**
   * Marks one company profile as default (atomic switch).
   *
   * @param id - Profile UUID.
   */
  setDefaultCompanyProfile(id) {
    if (!this.getCompanyProfile(id)) {
      throw new Error(`Company profile not found: ${id}`);
    }
    const run = this.db.transaction(() => {
      this.db.prepare(`UPDATE company_profiles SET is_default = 0`).run();
      this.db.prepare(`UPDATE company_profiles SET is_default = 1, updated_at = ? WHERE id = ?`).run(nowIso(), id);
    });
    run();
    const updated = this.getCompanyProfile(id);
    if (!updated) {
      throw new Error("Default switch failed");
    }
    return updated;
  }
  /**
   * Deletes a company profile (never the default).
   *
   * @param id - Profile UUID.
   */
  deleteCompanyProfile(id) {
    const current = this.getCompanyProfile(id);
    if (!current) {
      throw new Error(`Company profile not found: ${id}`);
    }
    if (current.isDefault) {
      throw new Error("The default company profile cannot be deleted");
    }
    this.db.prepare(`DELETE FROM company_profiles WHERE id = ?`).run(id);
  }
  /**
   * Creates a customer (buyer master data).
   *
   * @param name - Display name.
   * @param profile - Buyer party data.
   */
  createCustomer(name, profile) {
    var _a;
    if (name.trim().length === 0) {
      throw new Error("Customer needs a name");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    const withNumber = {
      ...profile,
      customerNumber: ((_a = profile.customerNumber) == null ? void 0 : _a.trim()) || this.nextCustomerNumber()
    };
    this.db.prepare(`INSERT INTO customers (id, name, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(id, name.trim(), JSON.stringify(withNumber), stamp, stamp);
    const created = this.getCustomer(id);
    if (!created) {
      throw new Error("Customer was not stored");
    }
    return created;
  }
  /**
   * Reserves the next automatic customer number. Kept in sync with the
   * numbers already in use, so a restore or a hand-edited number cannot
   * cause a collision.
   *
   * @returns The new number.
   */
  nextCustomerNumber() {
    var _a;
    const used = new Set(
      this.listCustomers().map((customer) => {
        var _a2;
        return (_a2 = customer.profile.customerNumber) == null ? void 0 : _a2.trim();
      }).filter((value) => !!value)
    );
    const row = this.db.prepare(`SELECT last_seq FROM customer_counters WHERE name = 'default'`).get();
    let seq = (_a = row == null ? void 0 : row.last_seq) != null ? _a : 0;
    let candidate = (0, import_invoice_model.formatCustomerNumber)(seq + 1);
    while (used.has(candidate)) {
      seq += 1;
      candidate = (0, import_invoice_model.formatCustomerNumber)(seq + 1);
    }
    this.db.prepare(
      `INSERT INTO customer_counters (name, last_seq) VALUES ('default', ?)
				 ON CONFLICT(name) DO UPDATE SET last_seq = excluded.last_seq`
    ).run(seq + 1);
    return candidate;
  }
  /**
   * Assigns numbers to customers that predate the automatic numbering
   * (existing records, restored backups). Numbers already present are kept.
   *
   * @returns The customers that received a new number.
   */
  assignMissingCustomerNumbers() {
    var _a;
    const changed = [];
    for (const customer of this.listCustomers()) {
      if ((_a = customer.profile.customerNumber) == null ? void 0 : _a.trim()) {
        continue;
      }
      const updated = this.updateCustomer(customer.id, {
        name: customer.name,
        profile: { ...customer.profile, customerNumber: this.nextCustomerNumber() }
      });
      changed.push(updated);
    }
    return changed;
  }
  /**
   * Loads one customer by id.
   *
   * @param id - Customer UUID.
   */
  getCustomer(id) {
    const row = this.db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
    return row ? mapCustomerRow(row) : null;
  }
  /**
   * Lists customers by name, optionally filtered by a fuzzy search term.
   *
   * @param query - Search term; typos and case differences are tolerated.
   */
  listCustomers(query) {
    const all = this.db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all();
    const mapped = all.map(mapCustomerRow);
    const needle = (query != null ? query : "").trim();
    if (!needle) {
      return mapped;
    }
    return rankCustomers(mapped, needle);
  }
  /**
   * Updates name/party data of a customer.
   *
   * @param id - Customer UUID.
   * @param patch - Partial update.
   */
  updateCustomer(id, patch) {
    var _a, _b;
    const current = this.getCustomer(id);
    if (!current) {
      throw new Error(`Customer not found: ${id}`);
    }
    const name = ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name;
    const profile = (_b = patch.profile) != null ? _b : current.profile;
    this.db.prepare(`UPDATE customers SET name = ?, profile_json = ?, updated_at = ? WHERE id = ?`).run(name, JSON.stringify(profile), nowIso(), id);
    const updated = this.getCustomer(id);
    if (!updated) {
      throw new Error("Customer update failed");
    }
    return updated;
  }
  /**
   * Deletes a customer.
   *
   * @param id - Customer UUID.
   */
  deleteCustomer(id) {
    if (!this.getCustomer(id)) {
      throw new Error(`Customer not found: ${id}`);
    }
    this.db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
  }
  /**
   * Creates a catalog product/service.
   *
   * @param item - Catalog content.
   */
  createProduct(item) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    if (!((_a = item.name) == null ? void 0 : _a.trim())) {
      throw new Error("Product needs a name");
    }
    if (item.vatRate !== void 0 && ![0, 7, 19].includes(item.vatRate)) {
      throw new Error("VAT rate must be 0, 7 or 19");
    }
    if (((_b = item.unitPriceNet) != null ? _b : 0) < 0) {
      throw new Error("Unit price must be >= 0");
    }
    const id = (0, import_node_crypto.randomUUID)();
    const stamp = nowIso();
    this.db.prepare(
      `INSERT INTO products (id, sku, name, details, unit, unit_price_net, vat_rate, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      (_d = (_c = item.sku) == null ? void 0 : _c.trim()) != null ? _d : "",
      item.name.trim(),
      (_f = (_e = item.details) == null ? void 0 : _e.trim()) != null ? _f : "",
      ((_g = item.unit) == null ? void 0 : _g.trim()) || "Stk",
      (_h = item.unitPriceNet) != null ? _h : 0,
      (_i = item.vatRate) != null ? _i : 19,
      stamp,
      stamp
    );
    const created = this.getProduct(id);
    if (!created) {
      throw new Error("Product was not stored");
    }
    return created;
  }
  /**
   * Loads one catalog product by id.
   *
   * @param id - Product UUID.
   */
  getProduct(id) {
    const row = this.db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    return row ? mapProductRow(row) : null;
  }
  /**
   * Lists catalog products by name.
   */
  listProducts() {
    const rows = this.db.prepare(`SELECT * FROM products ORDER BY name ASC`).all();
    return rows.map(mapProductRow);
  }
  /**
   * Updates a catalog product.
   *
   * @param id - Product UUID.
   * @param patch - Partial update.
   */
  updateProduct(id, patch) {
    var _a, _b, _c, _d;
    const current = this.getProduct(id);
    if (!current) {
      throw new Error(`Product not found: ${id}`);
    }
    const next = {
      sku: patch.sku !== void 0 ? patch.sku.trim() : current.sku,
      name: ((_a = patch.name) == null ? void 0 : _a.trim()) || current.name,
      details: patch.details !== void 0 ? patch.details : current.details,
      unit: ((_b = patch.unit) == null ? void 0 : _b.trim()) || current.unit,
      unitPriceNet: (_c = patch.unitPriceNet) != null ? _c : current.unitPriceNet,
      vatRate: (_d = patch.vatRate) != null ? _d : current.vatRate
    };
    if (![0, 7, 19].includes(next.vatRate)) {
      throw new Error("VAT rate must be 0, 7 or 19");
    }
    if (next.unitPriceNet < 0) {
      throw new Error("Unit price must be >= 0");
    }
    this.db.prepare(
      `UPDATE products SET sku = ?, name = ?, details = ?, unit = ?, unit_price_net = ?, vat_rate = ?, updated_at = ? WHERE id = ?`
    ).run(next.sku, next.name, next.details, next.unit, next.unitPriceNet, next.vatRate, nowIso(), id);
    const updated = this.getProduct(id);
    if (!updated) {
      throw new Error("Product update failed");
    }
    return updated;
  }
  /**
   * Deletes a catalog product.
   *
   * @param id - Product UUID.
   */
  deleteProduct(id) {
    if (!this.getProduct(id)) {
      throw new Error(`Product not found: ${id}`);
    }
    this.db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InvoiceDatabase,
  levenshtein,
  rankCustomers,
  retentionUntil
});
//# sourceMappingURL=db.js.map
